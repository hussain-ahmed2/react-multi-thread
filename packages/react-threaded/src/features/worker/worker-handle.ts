/**
 * Imperative worker handle.
 *
 * This is the engine behind the React hook, the pool, and proxies. It owns one
 * Worker instance (spawned lazily), tracks in-flight tasks, handles retries,
 * cancellation, timeouts, transferables, and plugin notifications.
 */

import { isSharedMemoryAvailable, isWorkerSupported } from '../../shared/environment'
import {
  CancelledError,
  isSerializedWorkerError,
  toError,
  WorkerDisposedError,
  WorkerTaskError,
  WorkerTimeoutError,
  WorkerUnsupportedError,
  WorkerUsageError,
} from '../../shared/errors'
import type { SerializedWorkerError } from '../../shared/errors'
import { delay, normalizeAttempts } from '../../shared/timing'
import { collectTransferables } from '../../shared/transferables'
import { systemClock } from '../../shared/types'
import type { RetryMeta, TaskErrorMeta, TaskMeta, WorkerPlugin } from '../plugins/types'
import type {
  AnyWorkerDefinition,
  CancelTaskOptions,
  TaskOptions,
  WorkerConfig,
  WorkerInput,
  WorkerMethodArgs,
  WorkerMethodKeys,
  WorkerMethodResult,
  WorkerOutput,
} from './types'
import { getWorkerUrl } from './worker-runtime'

/** A task waiting for a worker response. */
type PendingTask = {
  readonly id: number
  readonly onProgress: ((value: unknown) => void) | undefined
  readonly onMessage: ((message: unknown) => void) | undefined
  readonly succeed: (value: unknown) => void
  readonly fail: (error: Error) => void
}

/** Worker -> main thread messages. */
type WorkerReadyMessage = {
  readonly type: 'ready'
}

type WorkerInitErrorMessage = {
  readonly type: 'init-error'
  readonly error: SerializedWorkerError
}

type WorkerProgressMessage = {
  readonly type: 'progress'
  readonly id: number
  readonly value: unknown
}

type WorkerEventMessage = {
  readonly type: 'event'
  readonly id: number
  readonly message: unknown
}

type WorkerResultMessage = {
  readonly type: 'result'
  readonly id: number
  readonly value: unknown
}

type WorkerErrorMessage = {
  readonly type: 'error'
  readonly id: number
  readonly error: SerializedWorkerError
}

type WorkerInboundMessage =
  | WorkerReadyMessage
  | WorkerInitErrorMessage
  | WorkerProgressMessage
  | WorkerEventMessage
  | WorkerResultMessage
  | WorkerErrorMessage

/** Type guard for messages coming from a worker. */
function isWorkerInboundMessage(value: unknown): value is WorkerInboundMessage {
  if (value === null || typeof value !== 'object') return false

  const candidate = value as {
    readonly type?: unknown
    readonly id?: unknown
    readonly error?: unknown
  }

  switch (candidate.type) {
    case 'ready':
      return true
    case 'init-error':
      return isSerializedWorkerError(candidate.error)
    case 'progress':
    case 'event':
    case 'result':
      return typeof candidate.id === 'number'
    case 'error':
      return typeof candidate.id === 'number' && isSerializedWorkerError(candidate.error)
    default:
      return false
  }
}

/**
 * A single worker with a typed task API.
 *
 * @example
 * const definition = createWorker((n: number) => n * 2)
 * const handle = new WorkerHandle(definition)
 * const doubled = await handle.run(21)
 * handle.dispose()
 */
export class WorkerHandle<Definition extends AnyWorkerDefinition> {
  private readonly definition: Definition
  private readonly name: string
  private readonly plugins: readonly WorkerPlugin[]
  private readonly retry: NonNullable<WorkerConfig['retry']> | null
  private readonly onPluginError: WorkerConfig['onPluginError'] | undefined
  private readonly cancelBuffer: SharedArrayBuffer | null

  private worker: Worker | null = null
  private readyPromise: Promise<void> | null = null
  private readyResolve: (() => void) | null = null
  private readyReject: ((error: Error) => void) | null = null
  private cancelView: Int32Array | null = null

  private readonly pending = new Map<number, PendingTask>()
  private nextId = 1
  private disposed = false

  public constructor(definition: Definition, config: WorkerConfig = {}) {
    this.definition = definition
    this.name = config.name ?? definition.config.name ?? definition.name
    this.plugins = [...(config.plugins ?? definition.config.plugins ?? [])]
    this.retry = config.retry ?? definition.config.retry ?? null
    this.onPluginError = config.onPluginError ?? definition.config.onPluginError
    this.cancelBuffer = isSharedMemoryAvailable() ? new SharedArrayBuffer(4) : null

    if (this.cancelBuffer !== null) {
      this.cancelView = new Int32Array(this.cancelBuffer)
    }
  }

  /** Run a single-function worker. */
  public async run(
    input: WorkerInput<Definition>,
    options: TaskOptions = {},
  ): Promise<WorkerOutput<Definition>> {
    if (this.definition.kind !== 'function') {
      throw new WorkerUsageError(
        'run() requires a single-function worker. Use call() for methods workers.',
      )
    }

    const result = await this.invoke(null, [input], options)

    return result as WorkerOutput<Definition>
  }

  /** Call a named method on a methods-style worker. */
  public async call<Key extends WorkerMethodKeys<Definition>>(
    method: Key,
    args: WorkerMethodArgs<Definition, Key>,
    options: TaskOptions = {},
  ): Promise<WorkerMethodResult<Definition, Key>> {
    if (this.definition.kind !== 'methods') {
      throw new WorkerUsageError(
        'call() requires a methods-style worker. Use run() for single-function workers.',
      )
    }

    const result = await this.invoke(method, [...args], options)

    return result as WorkerMethodResult<Definition, Key>
  }

  /**
   * Low-level typed-erased invocation used by proxies and pools.
   * Prefer `run()` or `call()` in application code.
   */
  public invoke(
    method: string | null,
    args: readonly unknown[],
    options: TaskOptions = {},
  ): Promise<unknown> {
    return this.dispatch(method, [...args], options)
  }

  /** Spawn the worker without running a task. */
  public async warmup(): Promise<void> {
    this.ensureWorker()

    if (this.readyPromise !== null) {
      await this.readyPromise
    }
  }

  /**
   * Cancel every pending task.
   *
   * The default hard cancellation terminates the Worker immediately. The
   * cooperative mode asks the running function to stop at the next
   * `ctx.cancelled` check or `ctx.yield()` call and is only useful for
   * long-running async loops.
   */
  public cancel(options: CancelTaskOptions = {}): void {
    const mode = options.mode ?? 'terminate'

    if (mode === 'cooperative' && this.cancelView !== null) {
      try {
        Atomics.store(this.cancelView, 0, 1)
        Atomics.notify(this.cancelView, 0, 1)
      } catch {
        // Atomics is best-effort; message-based cancellation still works when
        // the worker yields.
      }
    }

    const ids = [...this.pending.keys()]

    if (this.worker !== null) {
      try {
        this.worker.postMessage({ type: 'cancel', ids })
      } catch {
        // The worker may have already terminated; rejection below still runs.
      }
    }

    const cancellation = new CancelledError('Task was cancelled')
    this.rejectAll(cancellation)

    if (mode === 'terminate') {
      this.killWorker(true, cancellation)
    }
  }

  /** Kill the current worker; the next task spawns a fresh one. */
  public restart(): void {
    if (this.disposed) return

    const cancellation = new CancelledError('Worker was restarted')
    this.rejectAll(cancellation)
    this.killWorker(true, cancellation)
  }

  /** Permanently release the worker. The handle cannot be used afterwards. */
  public dispose(): void {
    if (this.disposed) return

    this.disposed = true
    const disposedError = new WorkerDisposedError()
    this.rejectAll(disposedError)
    this.killWorker(true, disposedError)
  }

  private async dispatch(
    method: string | null,
    args: unknown[],
    options: TaskOptions,
  ): Promise<unknown> {
    this.assertUsable()

    const id = this.nextId
    this.nextId += 1

    const maxAttempts = this.retry !== null ? normalizeAttempts(this.retry.attempts) : 1
    const delayMs = this.retry?.delayMs ?? 0
    let attempt = 0
    let lastError: Error | null = null

    while (attempt < maxAttempts) {
      attempt += 1

      try {
        return await this.execute(id, method, args, options, attempt)
      } catch (error: unknown) {
        const normalized = toError(error)
        lastError = normalized

        // These failures are deterministic; retrying would only delay the
        // error the caller needs to see.
        if (
          normalized instanceof CancelledError ||
          normalized instanceof WorkerTimeoutError ||
          normalized instanceof WorkerDisposedError ||
          normalized instanceof WorkerUnsupportedError ||
          normalized instanceof WorkerUsageError
        ) {
          throw normalized
        }

        if (attempt >= maxAttempts) break

        const retryMeta: RetryMeta = {
          id,
          name: this.name,
          method,
          attempt,
          error: normalized,
          delayMs,
        }

        this.emitToPlugins((plugin) => plugin.onRetry?.(retryMeta))
        options.onRetry?.(retryMeta)

        await delay(delayMs, options.signal)
      }
    }

    throw lastError ?? new Error('Worker task failed')
  }

  private async execute(
    id: number,
    method: string | null,
    args: unknown[],
    options: TaskOptions,
    attempt: number,
  ): Promise<unknown> {
    const worker = this.ensureWorker()

    if (this.readyPromise !== null) {
      await this.readyPromise
    }

    if (this.disposed) throw new WorkerDisposedError()

    const startedAt = systemClock.now()
    const meta: TaskMeta = { id, name: this.name, method, attempt }

    this.emitToPlugins((plugin) => plugin.onTaskStart?.(meta))

    return new Promise<unknown>((resolve, reject) => {
      let settled = false
      let timeoutId: ReturnType<typeof setTimeout> | undefined
      let abortHandler: (() => void) | undefined

      const cleanup = (): void => {
        if (timeoutId !== undefined) clearTimeout(timeoutId)
        if (abortHandler !== undefined && options.signal !== undefined) {
          options.signal.removeEventListener('abort', abortHandler)
        }
        this.pending.delete(id)
      }

      const succeed = (value: unknown): void => {
        if (settled) return
        settled = true
        cleanup()

        const durationMs = systemClock.now() - startedAt
        this.emitToPlugins((plugin) =>
          plugin.onTaskSettled?.({
            ...meta,
            durationMs,
          }),
        )

        resolve(value)
      }

      const fail = (error: Error): void => {
        if (settled) return
        settled = true
        cleanup()

        const durationMs = systemClock.now() - startedAt
        const errorMeta: TaskErrorMeta = { ...meta, durationMs, error }
        this.emitToPlugins((plugin) => plugin.onTaskError?.(errorMeta))

        reject(error)
      }

      const pending: PendingTask = {
        id,
        onProgress: options.onProgress,
        onMessage: options.onMessage,
        succeed,
        fail,
      }

      this.pending.set(id, pending)

      if (options.signal !== undefined) {
        abortHandler = (): void => {
          this.cancel({ mode: 'terminate' })
        }

        if (options.signal.aborted) {
          abortHandler()
          return
        }

        options.signal.addEventListener('abort', abortHandler, { once: true })
      }

      if (options.timeoutMs !== undefined) {
        const timeoutMs = options.timeoutMs

        timeoutId = setTimeout(() => {
          const error = new WorkerTimeoutError(timeoutMs)
          this.rejectAll(error)
          this.killWorker(true, error)
        }, timeoutMs)
      }

      const transfer =
        options.transfer === 'auto'
          ? collectTransferables(args)
          : options.transfer !== undefined
            ? [...options.transfer]
            : undefined

      try {
        if (transfer === undefined) {
          worker.postMessage({ type: 'invoke', id, method, args })
        } else {
          worker.postMessage({ type: 'invoke', id, method, args }, transfer)
        }
      } catch (error: unknown) {
        fail(toError(error))
      }
    })
  }

  private ensureWorker(): Worker {
    this.assertUsable()

    if (this.worker !== null) return this.worker

    const worker = new Worker(getWorkerUrl(this.definition), { name: this.name })

    this.worker = worker
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve
      this.readyReject = reject
    })

    worker.onmessage = (event: MessageEvent<unknown>): void => {
      this.handleMessage(event.data)
    }

    worker.onerror = (event: ErrorEvent): void => {
      this.handleWorkerFailure(toError(event.error ?? event.message))
    }

    worker.onmessageerror = (): void => {
      this.handleWorkerFailure(new Error('Unable to deserialize a worker message'))
    }

    worker.postMessage({ type: 'init', cancelBuffer: this.cancelBuffer })

    this.emitToPlugins((plugin) => plugin.onWorkerCreated?.({ name: this.name, worker }))

    return worker
  }

  private handleMessage(message: unknown): void {
    if (!isWorkerInboundMessage(message)) return

    switch (message.type) {
      case 'ready': {
        const resolve = this.readyResolve
        this.readyResolve = null
        this.readyReject = null
        resolve?.()
        return
      }

      case 'init-error': {
        const reject = this.readyReject
        this.readyResolve = null
        this.readyReject = null
        reject?.(new WorkerTaskError(message.error))
        this.killWorker(true)
        return
      }

      case 'progress': {
        this.pending.get(message.id)?.onProgress?.(message.value)
        return
      }

      case 'event': {
        this.pending.get(message.id)?.onMessage?.(message.message)
        return
      }

      case 'result': {
        this.pending.get(message.id)?.succeed(message.value)
        return
      }

      case 'error': {
        this.pending.get(message.id)?.fail(new WorkerTaskError(message.error))
        return
      }

      default:
        return
    }
  }

  private handleWorkerFailure(error: Error): void {
    const rejectReady = this.readyReject

    this.readyResolve = null
    this.readyReject = null

    rejectReady?.(error)
    this.rejectAll(error)
    this.killWorker(true, error)
  }

  private rejectAll(error: Error): void {
    const tasks = [...this.pending.values()]
    this.pending.clear()

    for (const task of tasks) {
      task.fail(error)
    }
  }

  private killWorker(notifyPlugins: boolean, readyError?: Error): void {
    const worker = this.worker
    const rejectReady = this.readyReject

    this.worker = null
    this.readyPromise = null
    this.readyResolve = null
    this.readyReject = null

    // A task can be awaiting worker startup when cancellation/timeout happens.
    // Reject the handshake so `execute()` does not hang forever.
    if (readyError !== undefined) {
      rejectReady?.(readyError)
    }

    if (worker === null) return

    worker.onmessage = null
    worker.onerror = null
    worker.onmessageerror = null

    try {
      worker.terminate()
    } catch {
      // Termination is best-effort. The handle no longer references the worker
      // and will spawn a fresh one on the next task.
    }

    if (notifyPlugins) {
      this.emitToPlugins((plugin) => plugin.onWorkerTerminated?.({ name: this.name }))
    }
  }

  private emitToPlugins(emit: (plugin: WorkerPlugin) => void): void {
    for (const plugin of this.plugins) {
      try {
        emit(plugin)
      } catch (error: unknown) {
        this.onPluginError?.(toError(error), plugin)
      }
    }
  }

  private assertUsable(): void {
    if (this.disposed) throw new WorkerDisposedError()
    if (!isWorkerSupported()) throw new WorkerUnsupportedError()
  }
}
