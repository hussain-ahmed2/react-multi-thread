/**
 * Plugin contract.
 *
 * Plugins are intentionally small, synchronous observers. They can add logging,
 * metrics, or tracing without being able to alter task results. Keeping the
 * contract observational avoids a second extension mechanism that would need
 * its own error handling and tests.
 */

/** Context shared by every lifecycle callback. */
export type TaskMeta = {
  readonly id: number
  readonly name: string
  readonly method: string | null
  readonly attempt: number
}

/** Metadata emitted after a task settles successfully. */
export type TaskSettledMeta = TaskMeta & {
  readonly durationMs: number
}

/** Metadata emitted when a task fails. */
export type TaskErrorMeta = TaskSettledMeta & {
  readonly error: Error
}

/** Metadata emitted between retry attempts. */
export type RetryMeta = TaskMeta & {
  readonly error: Error
  readonly delayMs: number
}

/** Lifecycle metadata when a worker is spawned. */
export type WorkerCreatedMeta = {
  readonly name: string
  readonly worker: Worker
}

/** Lifecycle metadata when a worker is terminated. */
export type WorkerTerminatedMeta = {
  readonly name: string
}

/** Event names emitted by the built-in logger plugin. */
export type LoggerEvent =
  | 'worker-created'
  | 'worker-terminated'
  | 'task-start'
  | 'task-success'
  | 'task-error'
  | 'retry'

/** Structured logger record. */
export type LogEntry = {
  readonly event: LoggerEvent
  readonly timestamp: number
  readonly name: string
  readonly method: string | null
  readonly attempt: number
  readonly durationMs: number | null
  readonly error: Error | null
}

/** Configuration for `loggerPlugin()`. */
export type LoggerPluginConfig = {
  readonly onLog?: (entry: LogEntry) => void
  readonly prefix?: string
}

/** Structured timing record emitted by `timingPlugin()`. */
export type TimingEntry = {
  readonly name: string
  readonly method: string | null
  readonly attempt: number
  readonly durationMs: number
}

/** Configuration for `timingPlugin()`. */
export type TimingPluginConfig = {
  readonly onTiming: (entry: TimingEntry) => void
}

/** Observational plugin that can be attached to any worker definition. */
export type WorkerPlugin = {
  readonly name: string
  readonly onWorkerCreated?: (meta: WorkerCreatedMeta) => void
  readonly onWorkerTerminated?: (meta: WorkerTerminatedMeta) => void
  readonly onTaskStart?: (meta: TaskMeta) => void
  readonly onTaskSettled?: (meta: TaskSettledMeta) => void
  readonly onTaskError?: (meta: TaskErrorMeta) => void
  readonly onRetry?: (meta: RetryMeta) => void
}
