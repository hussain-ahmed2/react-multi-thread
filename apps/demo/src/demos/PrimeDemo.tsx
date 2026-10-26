import { useState } from 'react'
import { useWorker } from 'react-threaded'
import { CodeBlock } from '../components/CodeBlock'
import { GaugeIcon } from '../components/Icons'
import { ProgressBar } from '../components/ProgressBar'
import { Stat } from '../components/Stat'
import { StatusBadge } from '../components/StatusBadge'
import { primeWorker } from '../workers/definitions'

const limits = [10_000_000, 25_000_000, 50_000_000, 100_000_000] as const

const source = `const primeWorker = createWorker(async (limit, ctx) => {
  const composite = new Uint8Array(limit + 1)
  let count = 0

  for (let value = 2; value <= limit; value += 1) {
    if (composite[value] === 0) {
      count += 1
      for (let m = value * value; m <= limit; m += value)
        composite[m] = 1
    }

    if (value % 1_000_000 === 0) {
      ctx.progress(value / limit)
      if (ctx.cancelled) return { count, cancelled: true }
      await ctx.yield()
    }
  }

  return { count, cancelled: false }
})

function PrimeSearch() {
  const worker = useWorker(primeWorker)
  return (
    <button onClick={() => worker.run(limit)}>
      Search
    </button>
  )
}`

function countPrimesOnMainThread(limit: number): number {
  const composite = new Uint8Array(limit + 1)
  let count = 0

  for (let value = 2; value <= limit; value += 1) {
    if (composite[value] === 0) {
      count += 1

      if (value * value <= limit) {
        for (let multiple = value * value; multiple <= limit; multiple += value) {
          composite[multiple] = 1
        }
      }
    }
  }

  return count
}

type MainThreadState = {
  readonly status: 'idle' | 'running' | 'done'
  readonly count: number
  readonly durationMs: number
}

const idleMainThread: MainThreadState = { status: 'idle', count: 0, durationMs: 0 }

function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

function statusLabel(status: string): string {
  if (status === 'success') return 'Complete'
  if (status === 'running') return 'Working'
  if (status === 'cancelled') return 'Cancelled'
  if (status === 'error') return 'Failed'
  return 'Idle'
}

function statusTone(status: string): 'neutral' | 'info' | 'success' | 'danger' {
  if (status === 'success') return 'success'
  if (status === 'running') return 'info'
  if (status === 'error') return 'danger'
  return 'neutral'
}

export function PrimeDemo() {
  const [limit, setLimit] = useState<number>(50_000_000)
  const [mainThread, setMainThread] = useState<MainThreadState>(idleMainThread)
  const worker = useWorker(primeWorker)

  const progress = typeof worker.progress === 'number' ? worker.progress : null
  const isRunning = worker.status === 'running'

  const runWorker = () => {
    void worker.run(limit).catch(() => undefined)
  }

  const runMainThread = () => {
    setMainThread({ status: 'running', count: 0, durationMs: 0 })

    // Give the browser one frame to paint the "running" badge before blocking.
    window.setTimeout(() => {
      const startedAt = performance.now()
      const count = countPrimesOnMainThread(limit)
      setMainThread({
        status: 'done',
        count,
        durationMs: performance.now() - startedAt,
      })
    }, 80)
  }

  return (
    <div className="demo">
      <div className="demo__intro">
        <div className="demo__eyebrow">
          <GaugeIcon width={16} height={16} />
          Cooperative cancellation
        </div>
        <h2>Keep the main thread breathing.</h2>
        <p>
          A sieve of {formatNumber(limit)} numbers runs in a worker while the UI stays interactive.
          Cancel mid-flight with a hard terminate, or stop cooperatively at the next{' '}
          <code>ctx.yield()</code>. Run the same work on the main thread to feel the difference.
        </p>
      </div>

      <div className="demo__grid demo__grid--sidebar">
        <div className="panel">
          <div className="panel__head">
            <span className="panel__title">Controls</span>
            <StatusBadge tone={statusTone(worker.status)} pulse={isRunning}>
              {statusLabel(worker.status)}
            </StatusBadge>
          </div>

          <div className="field">
            <span className="field__label">Upper bound</span>
            <div className="segmented" role="group" aria-label="Prime search limit">
              {limits.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`segmented__item${option === limit ? ' is-active' : ''}`}
                  onClick={() => setLimit(option)}
                  disabled={isRunning}
                >
                  {option / 1_000_000}M
                </button>
              ))}
            </div>
          </div>

          <div className="button-row">
            <button type="button" className="button button--primary" onClick={runWorker} disabled={isRunning}>
              Run in worker
            </button>
            <button
              type="button"
              className="button"
              onClick={() => worker.cancel({ mode: 'terminate' })}
              disabled={!isRunning}
            >
              Cancel
            </button>
          </div>

          <div className="button-row">
            <button type="button" className="button button--ghost" onClick={runMainThread}>
              Run on main thread
            </button>
          </div>

          <p className="hint">
            The worker is terminated and respawned on cancel, so a tight synchronous loop can never
            lock up the tab.
          </p>
        </div>

        <div className="stack">
          <div className="panel panel--flush">
            <div className="result-card">
              <div className="result-card__head">
                <span className="result-card__label">Worker thread</span>
                <StatusBadge tone={statusTone(worker.status)} pulse={isRunning}>
                  {isRunning ? `${Math.round((progress ?? 0) * 100)}%` : statusLabel(worker.status)}
                </StatusBadge>
              </div>

              <ProgressBar value={isRunning ? progress ?? 0 : worker.status === 'success' ? 1 : 0} />

              <div className="stat-grid">
                <Stat
                  label="Prime count"
                  value={worker.result === null ? '—' : formatNumber(worker.result.count)}
                  tone="accent"
                />
                <Stat
                  label="Total time"
                  value={worker.durationMs === null ? '—' : `${worker.durationMs.toFixed(0)} ms`}
                />
                <Stat label="UI blocked" value="0 ms" tone="success" />
              </div>

              <p className="hint hint--tight">
                Total time includes worker startup and progress messaging. The main thread stays
                interactive throughout.
              </p>

              {worker.error === null ? null : (
                <p className="error-line">{worker.error.message}</p>
              )}
            </div>
          </div>

          <div className="panel panel--flush">
            <div className="result-card result-card--main">
              <div className="result-card__head">
                <span className="result-card__label">Main thread</span>
                <StatusBadge
                  tone={mainThread.status === 'done' ? 'warn' : mainThread.status === 'running' ? 'danger' : 'neutral'}
                  pulse={mainThread.status === 'running'}
                >
                  {mainThread.status === 'running'
                    ? 'Blocking UI'
                    : mainThread.status === 'done'
                      ? 'Finished'
                      : 'Untested'}
                </StatusBadge>
              </div>

              <div className="stat-grid">
                <Stat
                  label="Prime count"
                  value={mainThread.count === 0 ? '—' : formatNumber(mainThread.count)}
                  tone="danger"
                />
                <Stat
                  label="Total time"
                  value={
                    mainThread.durationMs === 0 ? '—' : `${mainThread.durationMs.toFixed(0)} ms`
                  }
                />
                <Stat
                  label="UI blocked"
                  value={
                    mainThread.status === 'running'
                      ? 'Running…'
                      : mainThread.status === 'done'
                        ? `${mainThread.durationMs.toFixed(0)} ms`
                        : '—'
                  }
                  tone="danger"
                />
              </div>

              <p className="hint hint--tight">
                Everything shares one thread: React renders, input handling, and the sieve. The tab
                cannot repaint or handle input until it finishes.
              </p>
            </div>
          </div>
        </div>
      </div>

      <CodeBlock code={source} title="PrimeDemo.tsx" />
    </div>
  )
}
