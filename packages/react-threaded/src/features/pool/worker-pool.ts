/**
 * Fixed-size worker pool.
 *
 * Scheduling is intentionally simple: spawn up to `size` workers, hand each one
 * a task, and queue the rest. Handles are reused. Cancelling a task kills its
 * worker, and the slot revives lazily on the next task.
 */

import { getDefaultPoolSize } from '../../shared/environment'
import {
  CancelledError,
  toError,
  WorkerDisposedError,
  WorkerUsageError,
} from '../../shared/errors'
import type {
  AnyWorkerDefinition,
  TaskOptions,
  WorkerInput,
  WorkerMethodArgs,
  WorkerMethodKeys,
  WorkerMethodResult,
  WorkerOutput,
} from '../worker/types'
import { WorkerHandle } from '../worker/worker-handle'
import type { PoolListener, PoolStats, WorkerPoolConfig } from './types'

/** A task waiting for an available slot. */
type PoolTask = {
  readonly method: string | null
  readonly args: readonly unknown[]
  readonly options: TaskOptions
  readonly resolve: (value: unknown) => void
  readonly reject: (error: Error) => void
  removeAbortListener: () => void
}

/** One worker and its current occupancy. */
type PoolSlot<Definition extends AnyWorkerDefinition> = {
  readonly handle: WorkerHandle<Definition>
  busy: boolean
}

/** Fixed-size pool with typed `run`, `call`, and `map` helpers. */
export class WorkerPool<Definition extends AnyWorkerDefinition> {
  private readonly definition: Definition
  private readonly config: WorkerPoolConfig
  private readonly size: number
  private readonly slots: PoolSlot<Definition>[] = []
  private readonly idle: PoolSlot<Definition>[] = []
  private readonly queue: PoolTask[] = []
  private readonly listeners = new Set<PoolListener>()

  private completed = 0
  private failed = 0
  private cancelled = 0
  private terminated = false

  public constructor(definition: Definition, config: WorkerPoolConfig = {}) {
    this.definition = definition
    this.config = config
    this.size = Math.max(1, Math.floor(config.size ?? getDefaultPoolSize()))
  }

  /** Queue a single-function task. */
  public run(
    input: WorkerInput<Definition>,
    options: TaskOptions = {},
  ): Promise<WorkerOutput<Definition>> {
    return this.enqueue(null, [input], options) as Promise<WorkerOutput<Definition>>
  }

  /** Queue a methods-style task. */
  public call<Key extends WorkerMethodKeys<Definition>>(
    method: Key,
    args: WorkerMethodArgs<Definition, Key>,
    options: TaskOptions = {},
  ): Promise<WorkerMethodResult<Definition, Key>> {
    return this.enqueue(method, [...args], options) as Promise<WorkerMethodResult<Definition, Key>>
  }

  /** Run the same task function over many inputs. */
  public map(
    inputs: readonly WorkerInput<Definition>[],
    options: TaskOptions = {},
  ): Promise<WorkerOutput<Definition>[]> {
    return Promise.all(inputs.map((input) => this.run(input, options)))
  }

  /** Current pool counters. */
  public getStats(): PoolStats {
    let active = 0

    for (const slot of this.slots) {
      if (slot.busy) active += 1
    }

    return {
      size: this.size,
      active,
      queued: this.queue.length,
      created: this.slots.length,
      completed: this.completed,
      failed: this.failed,
      cancelled: this.cancelled,
    }
  }

  /** Subscribe to stats changes. The listener is not called immediately. */
  public subscribe(listener: PoolListener): () => void {
    this.listeners.add(listener)

    return (): void => {
      this.listeners.delete(listener)
    }
  }

  /** Terminate every worker and reject queued tasks. */
  public terminate(): void {
    if (this.terminated) return

    this.terminated = true
    const error = new CancelledError('Worker pool was terminated')
    const queued = this.queue.splice(0)

    for (const task of queued) {
      task.removeAbortListener()
      this.cancelled += 1
      task.reject(error)
    }

    for (const slot of this.slots) {
      slot.handle.dispose()
    }

    this.slots.length = 0
    this.idle.length = 0
    this.emit()
  }

  private enqueue(
    method: string | null,
    args: readonly unknown[],
    options: TaskOptions,
  ): Promise<unknown> {
    if (this.terminated) {
      return Promise.reject(new WorkerDisposedError('This WorkerPool has been terminated'))
    }

    if (method === null && this.definition.kind !== 'function') {
      return Promise.reject(
        new WorkerUsageError('run() requires a single-function worker. Use call() instead.'),
      )
    }

    if (method !== null && this.definition.kind !== 'methods') {
      return Promise.reject(
        new WorkerUsageError('call() requires a methods-style worker. Use run() instead.'),
      )
    }

    return new Promise<unknown>((resolve, reject) => {
      if (options.signal?.aborted === true) {
        reject(new CancelledError('Task was aborted before it started'))
        return
      }

      const task: PoolTask = {
        method,
        args,
        options,
        resolve,
        reject,
        removeAbortListener: (): void => {
          // Replaced below once the abort handler exists.
        },
      }

      const handleAbort = (): void => {
        const index = this.queue.indexOf(task)

        // A running task is cancelled by its worker handle, which also receives
        // the abort signal. Only remove tasks that have not started.
        if (index === -1) return

        this.queue.splice(index, 1)
        task.removeAbortListener()
        this.cancelled += 1
        this.emit()
        reject(new CancelledError('Task was aborted while queued'))
      }

      task.removeAbortListener = (): void => {
        options.signal?.removeEventListener('abort', handleAbort)
      }

      options.signal?.addEventListener('abort', handleAbort, { once: true })
      this.queue.push(task)
      this.pump()
    })
  }

  private pump(): void {
    if (this.terminated) return

    while (this.queue.length > 0) {
      const slot = this.acquireSlot()

      if (slot === null) {
        break
      }

      const task = this.queue.shift()

      if (task === undefined) {
        slot.busy = false
        this.idle.push(slot)
        break
      }

      // From here on, lifecycle is owned by the worker handle.
      task.removeAbortListener()
      this.dispatch(slot, task)
    }

    this.emit()
  }

  private acquireSlot(): PoolSlot<Definition> | null {
    const idle = this.idle.pop()

    if (idle !== undefined) {
      idle.busy = true
      return idle
    }

    if (this.slots.length >= this.size) {
      return null
    }

    const handle = new WorkerHandle<Definition>(this.definition, this.config)
    const slot: PoolSlot<Definition> = { handle, busy: true }

    this.slots.push(slot)

    return slot
  }

  private dispatch(slot: PoolSlot<Definition>, task: PoolTask): void {
    const invocation =
      task.method === null
        ? slot.handle.run(task.args[0] as WorkerInput<Definition>, task.options)
        : slot.handle.invoke(task.method, task.args, task.options)

    invocation
      .then(
        (value: unknown): void => {
          this.completed += 1
          task.resolve(value)
        },
        (error: unknown): void => {
          const normalized = toError(error)

          if (
            this.terminated ||
            normalized instanceof CancelledError ||
            normalized instanceof WorkerDisposedError
          ) {
            this.cancelled += 1
          } else {
            this.failed += 1
          }

          task.reject(normalized)
        },
      )
      .finally((): void => {
        slot.busy = false

        if (this.terminated) return

        this.idle.push(slot)
        this.pump()
      })
  }

  private emit(): void {
    if (this.listeners.size === 0) return

    const stats = this.getStats()

    for (const listener of [...this.listeners]) {
      try {
        listener(stats)
      } catch {
        // A broken subscriber must not stall the scheduler.
      }
    }
  }

}
