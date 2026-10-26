import { useMemo, useState } from 'react'
import { createWorker, loggerPlugin, useWorker } from 'react-threaded'
import type { LogEntry } from 'react-threaded'
import { CodeBlock } from '../components/CodeBlock'
import { ShieldIcon } from '../components/Icons'
import { LogPanel } from '../components/LogPanel'
import { Stat } from '../components/Stat'
import { StatusBadge } from '../components/StatusBadge'

const failureOptions = [0, 1, 2, 3] as const

const source = `const flakyWorker = createWorker(
  async ({ failures }, ctx) => {
    // State lives inside the worker between retries.
    self.attempts = (self.attempts ?? 0) + 1

    if (self.attempts <= failures) {
      throw new Error(\`Transient failure #\${self.attempts}\`)
    }

    ctx.progress(1)
    return { attempts: self.attempts }
  },
  {
    retry: { attempts: 4, delayMs: 500 },
    plugins: [
      loggerPlugin({
        onLog: (entry) => setLogs((logs) => [...logs, entry]),
      }),
    ],
  },
)

const worker = useWorker(flakyWorker)`

export function PluginsDemo() {
  const [failures, setFailures] = useState<number>(2)
  const [logs, setLogs] = useState<readonly LogEntry[]>([])

  const flakyWorker = useMemo(
    () =>
      createWorker(
        async (input: { readonly failures: number }, context) => {
          const scope = self as unknown as { attempts?: number }
          scope.attempts = (scope.attempts ?? 0) + 1

          if (scope.attempts <= input.failures) {
            throw new Error(`Transient failure #${scope.attempts}`)
          }

          context.progress(1)
          return { attempts: scope.attempts, failuresSkipped: input.failures }
        },
        {
          name: 'flaky-demo-worker',
          retry: { attempts: 4, delayMs: 500 },
          plugins: [
            loggerPlugin({
              onLog: (entry) => {
                setLogs((current) => [...current.slice(-24), entry])
              },
            }),
          ],
        },
      ),
    [],
  )

  const worker = useWorker(flakyWorker)
  const isRunning = worker.status === 'running'

  const run = () => {
    void worker.run({ failures }).catch(() => undefined)
  }

  return (
    <div className="demo">
      <div className="demo__intro">
        <div className="demo__eyebrow">
          <ShieldIcon width={16} height={16} />
          Retries & plugins
        </div>
        <h2>Failures are data, not crashes.</h2>
        <p>
          Retry policies, logging, timing, and telemetry are attached declaratively. Plugins observe
          the lifecycle without being able to corrupt a result, and a thrown task error is retried
          with a fresh attempt count before it reaches React.
        </p>
      </div>

      <div className="demo__grid demo__grid--sidebar">
        <div className="panel">
          <div className="panel__head">
            <span className="panel__title">Failure injection</span>
            <StatusBadge
              tone={
                worker.status === 'error' ? 'danger' : worker.status === 'success' ? 'success' : isRunning ? 'info' : 'neutral'
              }
              pulse={isRunning}
            >
              {isRunning ? 'Retrying' : worker.status}
            </StatusBadge>
          </div>

          <div className="field">
            <span className="field__label">Consecutive failures</span>
            <div className="segmented" role="group" aria-label="Consecutive failures">
              {failureOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`segmented__item${option === failures ? ' is-active' : ''}`}
                  onClick={() => setFailures(option)}
                  disabled={isRunning}
                >
                  {option}
                </button>
              ))}
            </div>
            <span className="field__hint">
              The engine allows 4 attempts with a 500 ms backoff between them.
            </span>
          </div>

          <div className="button-row">
            <button type="button" className="button button--primary" onClick={run} disabled={isRunning}>
              Run flaky task
            </button>
            <button type="button" className="button" onClick={() => worker.restart()} disabled={isRunning}>
              New worker
            </button>
          </div>

          <div className="stat-grid stat-grid--compact">
            <Stat label="Attempts" value={worker.attempts} tone="accent" />
            <Stat
              label="Duration"
              value={worker.durationMs === null ? '—' : `${worker.durationMs.toFixed(0)} ms`}
            />
            <Stat
              label="Skipped"
              value={worker.result === null ? '—' : worker.result.failuresSkipped}
              tone={worker.result === null ? 'default' : 'success'}
            />
          </div>

          {worker.error === null ? null : <p className="error-line">{worker.error.message}</p>}
        </div>

        <div className="stack">
          <LogPanel entries={logs} />
        </div>
      </div>

      <CodeBlock code={source} title="PluginsDemo.tsx" />
    </div>
  )
}
