import { useState } from 'react'
import { useWorkerPool } from 'react-threaded'
import { CodeBlock } from '../components/CodeBlock'
import { LayersIcon } from '../components/Icons'
import { Stat } from '../components/Stat'
import { StatusBadge } from '../components/StatusBadge'
import type { CrunchOutput } from '../workers/definitions'
import { crunchWorker } from '../workers/definitions'

const taskCounts = [4, 8, 16, 32] as const
const poolSizes = [1, 2, 4, 8] as const
const workloads = [10_000_000, 25_000_000, 50_000_000] as const

const source = `const pool = useWorkerPool(crunchWorker, { size: 4 })

// Fan out: the pool keeps four workers busy and queues the rest.
const results = await pool.map(
  Array.from({ length: 16 }, (_, id) => ({
    id,
    iterations: 25_000_000,
  })),
)

// Live counters update on every scheduling decision.
console.log(pool.stats)
// { size: 4, active: 4, queued: 8, completed: 0, ... }`

export function PoolDemo() {
  const [size, setSize] = useState<number>(4)
  const [taskCount, setTaskCount] = useState<number>(16)
  const [iterations, setIterations] = useState<number>(25_000_000)
  const [results, setResults] = useState<readonly CrunchOutput[]>([])
  const [elapsed, setElapsed] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pool = useWorkerPool(crunchWorker, { size })

  const run = async () => {
    if (busy) return

    setBusy(true)
    setError(null)
    setResults([])
    setElapsed(null)

    const inputs = Array.from({ length: taskCount }, (_, id) => ({ id, iterations }))
    const startedAt = performance.now()

    try {
      const outputs = await pool.map(inputs)
      setResults(outputs)
      setElapsed(performance.now() - startedAt)
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const workerTime = results.reduce((total, result) => total + result.durationMs, 0)
  const slowest = results.reduce((max, result) => Math.max(max, result.durationMs), 0)
  const speedup = elapsed !== null && elapsed > 0 ? workerTime / elapsed : null

  return (
    <div className="demo">
      <div className="demo__intro">
        <div className="demo__eyebrow">
          <LayersIcon width={16} height={16} />
          Worker pool
        </div>
        <h2>Fill every core, keep every task typed.</h2>
        <p>
          A pool fans work across a dedicated set of workers and queues the rest. Launch{' '}
          {taskCount} tasks and watch the scheduler hold exactly {size} worker
          {size === 1 ? '' : 's'} busy. Rebuilding the pool with a new size is a single state change.
        </p>
      </div>

      <div className="demo__grid demo__grid--sidebar">
        <div className="panel">
          <div className="panel__head">
            <span className="panel__title">Scheduler</span>
            <StatusBadge tone={busy ? 'info' : 'success'} pulse={busy}>
              {busy ? 'Dispatching' : 'Idle'}
            </StatusBadge>
          </div>

          <div className="field">
            <span className="field__label">Pool size</span>
            <div className="segmented" role="group" aria-label="Pool size">
              {poolSizes.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`segmented__item${option === size ? ' is-active' : ''}`}
                  onClick={() => setSize(option)}
                  disabled={busy}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="field__label">Tasks</span>
            <div className="segmented" role="group" aria-label="Task count">
              {taskCounts.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`segmented__item${option === taskCount ? ' is-active' : ''}`}
                  onClick={() => setTaskCount(option)}
                  disabled={busy}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="field__label">Iterations per task</span>
            <div className="segmented" role="group" aria-label="Iterations per task">
              {workloads.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`segmented__item${option === iterations ? ' is-active' : ''}`}
                  onClick={() => setIterations(option)}
                  disabled={busy}
                >
                  {option / 1_000_000}M
                </button>
              ))}
            </div>
          </div>

          <div className="button-row">
            <button type="button" className="button button--primary" onClick={() => void run()} disabled={busy}>
              Run {taskCount} tasks
            </button>
            <button
              type="button"
              className="button"
              onClick={() => pool.terminate()}
              disabled={busy}
            >
              Terminate
            </button>
          </div>

          <p className="hint">
            Each worker is a real OS-backed thread. The main thread only coordinates promises and
            state.
          </p>
        </div>

        <div className="stack">
          <div className="panel panel--flush">
            <div className="result-card">
              <div className="result-card__head">
                <span className="result-card__label">Live pool</span>
                <span className="live-dot" data-active={pool.stats.active > 0}>
                  {pool.stats.active > 0 ? 'streaming' : 'waiting'}
                </span>
              </div>

              <div className="stat-grid stat-grid--compact">
                <Stat label="Active" value={pool.stats.active} tone="accent" />
                <Stat label="Queued" value={pool.stats.queued} />
                <Stat label="Completed" value={pool.stats.completed} tone="success" />
                <Stat label="Workers" value={`${pool.stats.created}/${size}`} />
              </div>

              <div className="stat-grid">
                <Stat
                  label="Wall time"
                  value={elapsed === null ? '—' : `${elapsed.toFixed(0)} ms`}
                  tone="accent"
                />
                <Stat
                  label="Σ worker time"
                  value={workerTime === 0 ? '—' : `${workerTime.toFixed(0)} ms`}
                />
                <Stat
                  label="Speedup"
                  value={speedup === null ? '—' : `${speedup.toFixed(1)}×`}
                  tone="success"
                />
              </div>

              {error === null ? null : <p className="error-line">{error}</p>}
            </div>
          </div>

          <div className="panel panel--flush">
            <div className="task-bars">
              <div className="task-bars__head">
                <span>Task timeline</span>
                <span>{results.length === 0 ? 'run to inspect' : `${results.length} results`}</span>
              </div>

              {results.length === 0 ? (
                <p className="empty-state">
                  Submit a batch to see per-task duration and result hashes.
                </p>
              ) : (
                results.map((result) => (
                  <div className="task-bar" key={result.id}>
                    <span className="task-bar__id">#{result.id.toString().padStart(2, '0')}</span>
                    <div className="task-bar__track">
                      <span
                        className="task-bar__fill"
                        style={{ width: `${slowest === 0 ? 0 : (result.durationMs / slowest) * 100}%` }}
                      />
                    </div>
                    <span className="task-bar__time">{result.durationMs.toFixed(0)} ms</span>
                    <span className="task-bar__hash">
                      {result.hash.toString(16).padStart(8, '0')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <CodeBlock code={source} title="PoolDemo.tsx" />
    </div>
  )
}
