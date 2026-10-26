/**
 * Error primitives shared by every react-threaded subsystem.
 *
 * Keeping errors in one place lets the worker, pool, and React layers agree on
 * semantics: cancellation is always a `CancelledError`, a remote failure is
 * always a `WorkerTaskError`, and lifecycle misuse is explicit.
 */

/** Error shape sent across the worker boundary. Errors are not cloneable. */
export type SerializedWorkerError = {
  readonly name: string
  readonly message: string
  readonly stack?: string
}

/** An error thrown inside a worker and reconstructed on the main thread. */
export class WorkerTaskError extends Error {
  public readonly remoteStack: string | undefined

  public constructor(info: SerializedWorkerError) {
    super(info.message)
    this.name = info.name
    this.remoteStack = info.stack

    // Keep the local call site in the stack while still exposing the worker's
    // original stack for debugging.
    if (info.stack !== undefined) {
      this.stack = `${this.name}: ${this.message}\n${info.stack}`
    }
  }
}

/** Thrown when a task is cancelled or an abort signal fires. */
export class CancelledError extends Error {
  public readonly reason: string

  public constructor(reason = 'Task was cancelled') {
    super(reason)
    this.name = 'CancelledError'
    this.reason = reason
  }
}

/** Thrown when a task exceeds its configured timeout. */
export class WorkerTimeoutError extends Error {
  public readonly timeoutMs: number

  public constructor(timeoutMs: number) {
    super(`Worker task timed out after ${timeoutMs}ms`)
    this.name = 'WorkerTimeoutError'
    this.timeoutMs = timeoutMs
  }
}

/** Thrown when the runtime cannot create a worker (SSR, old browser, CSP). */
export class WorkerUnsupportedError extends Error {
  public constructor(message = 'Web Workers are not available in this environment') {
    super(message)
    this.name = 'WorkerUnsupportedError'
  }
}

/** Thrown when a handle or pool is used after being disposed. */
export class WorkerDisposedError extends Error {
  public constructor(message = 'This worker handle has been disposed') {
    super(message)
    this.name = 'WorkerDisposedError'
  }
}

/** Thrown when a typed API is used with the wrong worker flavour. */
export class WorkerUsageError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'WorkerUsageError'
  }
}

/** Convert any caught value into an `Error` without losing useful messages. */
export function toError(value: unknown): Error {
  if (value instanceof Error) return value

  if (typeof value === 'string') return new Error(value)

  if (value !== null && typeof value === 'object') {
    try {
      return new Error(JSON.stringify(value))
    } catch {
      return new Error(String(value))
    }
  }

  return new Error(String(value))
}

/** Runtime guard for payloads coming from a worker. */
export function isSerializedWorkerError(value: unknown): value is SerializedWorkerError {
  if (value === null || typeof value !== 'object') return false

  const candidate = value as Partial<SerializedWorkerError>

  return (
    typeof candidate.name === 'string' &&
    typeof candidate.message === 'string' &&
    (candidate.stack === undefined || typeof candidate.stack === 'string')
  )
}
