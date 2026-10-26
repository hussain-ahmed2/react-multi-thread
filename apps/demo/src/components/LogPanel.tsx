import type { LogEntry, LoggerEvent } from 'react-threaded'

export type LogPanelProps = {
  readonly entries: readonly LogEntry[]
}

const toneByEvent: Record<LoggerEvent, string> = {
  'worker-created': 'info',
  'worker-terminated': 'danger',
  'task-start': 'info',
  'task-success': 'success',
  'task-error': 'danger',
  retry: 'warn',
}

export function LogPanel({ entries }: LogPanelProps) {
  return (
    <div className="log-panel" aria-live="polite">
      <div className="log-panel__head">
        <span>Plugin log</span>
        <span className="log-panel__count">{entries.length} entries</span>
      </div>

      <div className="log-panel__body">
        {entries.length === 0 ? (
          <p className="log-panel__empty">Run a task to stream structured plugin events.</p>
        ) : (
          [...entries].reverse().map((entry, index) => (
            <div className="log-row" key={`${entry.event}-${index}-${entry.timestamp}`}>
              <span className={`log-row__event log-row__event--${toneByEvent[entry.event]}`}>
                {entry.event}
              </span>
              <span className="log-row__method">{entry.method ?? 'run'}</span>
              {entry.attempt > 0 ? (
                <span className="log-row__meta">attempt {entry.attempt}</span>
              ) : null}
              {entry.durationMs === null ? null : (
                <span className="log-row__meta">{entry.durationMs.toFixed(1)}ms</span>
              )}
              {entry.error === null ? null : (
                <span className="log-row__error">{entry.error.message}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
