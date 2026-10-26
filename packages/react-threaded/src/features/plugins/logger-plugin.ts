/**
 * Console/telemetry logger.
 *
 * The plugin never throws: the worker handle isolates plugin errors. This makes
 * it safe to attach in development and in production telemetry pipelines.
 */

import type { LoggerPluginConfig, LogEntry, WorkerPlugin } from './types'

/** Create a plugin that reports every lifecycle event to a sink. */
export function loggerPlugin(config: LoggerPluginConfig = {}): WorkerPlugin {
  const sink =
    config.onLog ??
    ((entry: LogEntry): void => {
      const label = `${config.prefix ?? '[react-threaded]'} ${entry.event}`

      if (entry.error !== null) {
        console.warn(label, entry.name, entry.method ?? 'run', entry.error)
        return
      }

      console.debug(label, {
        name: entry.name,
        method: entry.method ?? 'run',
        attempt: entry.attempt,
        durationMs: entry.durationMs,
      })
    })

  return {
    name: 'logger',
    onWorkerCreated: ({ name }): void => {
      sink({
        event: 'worker-created',
        timestamp: Date.now(),
        name,
        method: null,
        attempt: 0,
        durationMs: null,
        error: null,
      })
    },
    onWorkerTerminated: ({ name }): void => {
      sink({
        event: 'worker-terminated',
        timestamp: Date.now(),
        name,
        method: null,
        attempt: 0,
        durationMs: null,
        error: null,
      })
    },
    onTaskStart: (meta): void => {
      sink({
        event: 'task-start',
        timestamp: Date.now(),
        name: meta.name,
        method: meta.method,
        attempt: meta.attempt,
        durationMs: null,
        error: null,
      })
    },
    onTaskSettled: (meta): void => {
      sink({
        event: 'task-success',
        timestamp: Date.now(),
        name: meta.name,
        method: meta.method,
        attempt: meta.attempt,
        durationMs: meta.durationMs,
        error: null,
      })
    },
    onTaskError: (meta): void => {
      sink({
        event: 'task-error',
        timestamp: Date.now(),
        name: meta.name,
        method: meta.method,
        attempt: meta.attempt,
        durationMs: meta.durationMs,
        error: meta.error,
      })
    },
    onRetry: (meta): void => {
      sink({
        event: 'retry',
        timestamp: Date.now(),
        name: meta.name,
        method: meta.method,
        attempt: meta.attempt,
        durationMs: null,
        error: meta.error,
      })
    },
  }
}
