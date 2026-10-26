import { useState } from 'react'
import { useSharedAtom, useWorkerPool } from 'react-threaded'
import { CodeBlock } from '../components/CodeBlock'
import { AtomIcon } from '../components/Icons'
import { Stat } from '../components/Stat'
import { StatusBadge } from '../components/StatusBadge'
import type { SharedIncrementOutput } from '../workers/definitions'
import { sharedCounter, sharedIncrementWorker } from '../workers/definitions'

const workerCount = 4
const iterationOptions = [1_000_000, 5_000_000, 10_000_000] as const

const source = `const counter = createSharedAtom(0, { name: 'total' })

// Hand the SharedArrayBuffer to any worker.
const output = await pool.run({
  buffer: counter.buffer,
  iterations: 5_000_000,
  workerId: 0,
})

// Inside the worker: a lock-free hardware atomic.
Atomics.add(new Int32Array(input.buffer), 0, 1)`

type WorkerReport = SharedIncrementOutput & {
  readonly label: string
}

export function SharedAtomDemo() {
  const [value, setValue] = useSharedAtom(sharedCounter, { pollMs: 50 })
  const [iterations, setIterations] = useState<number>(5_000_000)
  const [reports, setReports] = useState<readonly WorkerReport[]>([])
  const [localTotal, setLocalTotal] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pool = useWorkerPool(sharedIncrementWorker, { size: workerCount })

  const isShared = sharedCounter.isShared
  const expected = workerCount * iterations
  const displayed = isShared ? value : localTotal
  const percent = expected === 0 ? 0 : Math.min(100, (displayed / expected) * 100)

  const run = async () => {
    if (busy) return

    setBusy(true)
    setError(null)
    setReports([])
    setLocalTotal(0)
    setValue(0)

    const inputs = Array.from({ length: workerCount }, (_, workerId) => ({
      buffer: sharedCounter.buffer,
      iterations,
      workerId,
    }))

    try {
      const outputs = await pool.map(inputs)
      setReports(
        outputs.map((output) => ({
          ...output,
          label: `w${output.workerId}`,
        })),
      )
      setLocalTotal(outputs.reduce((total, output) => total + output.local, 0))
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    setValue(0)
    setLocalTotal(0)
    setReports([])
  }

  return (
    <div className="demo">
      <div className="demo__intro">
        <div className="demo__eyebrow">
          <AtomIcon width={16} height={16} />
          Shared atomics
        </div>
        <h2>One counter. Four threads. Zero locks.</h2>
        <p>
          <code>SharedArrayBuffer</code> and <code>Atomics.add</code> let workers mutate the same
          memory without messages, mutexes, or serialization. The React hook polls the atomic and
          re-renders when it changes. When shared memory is unavailable the atom transparently falls
          back to local worker counts.
        </p>
      </div>

      <div className="demo__grid demo__grid--sidebar">
        <div className="panel">
          <div className="panel__head">
            <span className="panel__title">Atom</span>
            <StatusBadge tone={isShared ? 'success' : 'warn'} pulse={busy}>
              {isShared ? 'SharedArrayBuffer' : 'Local fallback'}
            </StatusBadge>
          </div>

          <div className="field">
            <span className="field__label">Increments per worker</span>
            <div className="segmented" role="group" aria-label="Increments per worker">
              {iterationOptions.map((option) => (
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
              Run {workerCount} workers
            </button>
            <button type="button" className="button" onClick={reset} disabled={busy}>
              Reset
            </button>
          </div>

          <div className="atom-readout">
            <span className="atom-readout__label">
              {isShared ? 'Atomics value' : 'Local fallback total'}
            </span>
            <strong className="atom-readout__value">{displayed.toLocaleString('en-US')}</strong>
            <span className="atom-readout__meta">
              target {expected.toLocaleString('en-US')} · {percent.toFixed(0)}%
            </span>
          </div>

          <div className="worker-lanes">
            {Array.from({ length: workerCount }, (_, index) => {
              const report = reports.find((entry) => entry.workerId === index)

              return (
                <div className={`worker-lane${busy ? ' is-busy' : ''}`} key={index}>
                  <span className="worker-lane__dot" />
                  <span className="worker-lane__name">worker {index + 1}</span>
                  <span className="worker-lane__value">
                    {report === undefined
                      ? busy
                        ? 'incrementing…'
                        : 'idle'
                      : isShared
                        ? 'atomic'
                        : `${report.local.toLocaleString('en-US')} local`}
                  </span>
                </div>
              )
            })}
          </div>

          {error === null ? null : <p className="error-line">{error}</p>}
        </div>

        <div className="stack">
          <div className="panel panel--flush">
            <div className="result-card">
              <div className="result-card__head">
                <span className="result-card__label">Cross-thread counter</span>
                <span className="live-dot" data-active={busy || isShared}>
                  {isShared ? 'live' : 'isolated'}
                </span>
              </div>

              <div className="stat-grid">
                <Stat label="Value" value={displayed.toLocaleString('en-US')} tone="accent" />
                <Stat label="Workers" value={workerCount} />
                <Stat label="Operations" value={expected.toLocaleString('en-US')} />
              </div>

              <div className="meter">
                <span style={{ width: `${percent}%` }} />
              </div>

              <p className="hint hint--tight">
                {isShared
                  ? 'Every worker adds to the same Int32 slot. The UI sees the value climb while tasks are still running.'
                  : 'SharedArrayBuffer is not available in this context. Workers counted locally and returned their totals; the sum is shown instead.'}
              </p>
            </div>
          </div>

          <div className="callout">
            <span className="callout__title">Requires cross-origin isolation</span>
            <p>
              Set <code>Cross-Origin-Opener-Policy: same-origin</code> and{' '}
              <code>Cross-Origin-Embedder-Policy: require-corp</code>. The demo dev server and
              preview headers already do this.
            </p>
          </div>
        </div>
      </div>

      <CodeBlock code={source} title="SharedAtomDemo.tsx" />
    </div>
  )
}
