import { useState } from 'react'
import { useWorker } from 'react-threaded'
import { CodeBlock } from '../components/CodeBlock'
import { BoltIcon } from '../components/Icons'
import { ProgressBar } from '../components/ProgressBar'
import { Stat } from '../components/Stat'
import { StatusBadge } from '../components/StatusBadge'
import { checksumWorker } from '../workers/definitions'

const sizes = [1_000_000, 2_000_000, 4_000_000] as const

const source = `// The buffer is handed to the worker — zero copies.
const buffer = new ArrayBuffer(16 * 1024 * 1024)

const result = await worker.run(
  { buffer, passes: 3 },
  { transfer: [buffer] },
)

// Ownership moved: the main-thread buffer is now detached.
console.log(buffer.byteLength) // 0
console.log(result.total)      // computed off-thread`

function createBuffer(elements: number): ArrayBuffer {
  const buffer = new ArrayBuffer(elements * Float64Array.BYTES_PER_ELEMENT)
  const view = new Float64Array(buffer)

  for (let index = 0; index < view.length; index += 1) {
    view[index] = (index % 997) / 7
  }

  return buffer
}

type Mode = 'transfer' | 'clone'

type Outcome = {
  readonly mode: Mode
  readonly total: number
  readonly durationMs: number
  readonly bytes: number
  readonly detached: boolean
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  return `${(bytes / 1_000).toFixed(0)} KB`
}

export function TransferDemo() {
  const [elements, setElements] = useState<number>(2_000_000)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [busy, setBusy] = useState<Mode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const worker = useWorker(checksumWorker)

  const progress = typeof worker.progress === 'number' ? worker.progress : null
  const inputBytes = elements * Float64Array.BYTES_PER_ELEMENT

  const run = async (mode: Mode) => {
    if (busy !== null) return

    setBusy(mode)
    setError(null)

    const buffer = createBuffer(elements)
    const bytes = buffer.byteLength
    const startedAt = performance.now()

    try {
      const result = await worker.run(
        { buffer, passes: 3 },
        mode === 'transfer' ? { transfer: [buffer] } : {},
      )

      setOutcome({
        mode,
        total: result.total,
        durationMs: performance.now() - startedAt,
        bytes,
        detached: buffer.byteLength === 0,
      })
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="demo">
      <div className="demo__intro">
        <div className="demo__eyebrow">
          <BoltIcon width={16} height={16} />
          Zero-copy transferables
        </div>
        <h2>Move megabytes without copying them.</h2>
        <p>
          Structured clone copies every byte. Transferable objects move ownership instead, turning a
          multi-megabyte copy into a pointer handoff. The worker computes a checksum over the typed
          array and reports how many bytes it actually received.
        </p>
      </div>

      <div className="demo__grid demo__grid--sidebar">
        <div className="panel">
          <div className="panel__head">
            <span className="panel__title">Payload</span>
            <StatusBadge tone={busy === null ? 'success' : 'info'} pulse={busy !== null}>
              {busy === null ? 'Ready' : busy === 'transfer' ? 'Transferring' : 'Cloning'}
            </StatusBadge>
          </div>

          <div className="field">
            <span className="field__label">Float64 buffer</span>
            <div className="segmented" role="group" aria-label="Buffer size">
              {sizes.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`segmented__item${option === elements ? ' is-active' : ''}`}
                  onClick={() => setElements(option)}
                  disabled={busy !== null}
                >
                  {option / 1_000_000}M
                </button>
              ))}
            </div>
            <span className="field__hint">
              {inputBytes.toLocaleString('en-US')} bytes · 3 passes ·{' '}
              {formatBytes(inputBytes)}
            </span>
          </div>

          <div className="button-stack">
            <button
              type="button"
              className="button button--primary"
              onClick={() => void run('transfer')}
              disabled={busy !== null}
            >
              Run with transfer
            </button>
            <button
              type="button"
              className="button"
              onClick={() => void run('clone')}
              disabled={busy !== null}
            >
              Run with structured clone
            </button>
          </div>

          <p className="hint">
            Transfer is opt-in for inputs because it is destructive: once posted, the sender's
            buffer is detached.
          </p>
        </div>

        <div className="stack">
          <div className="panel panel--flush">
            <div className="result-card">
              <div className="result-card__head">
                <span className="result-card__label">Last run</span>
                <StatusBadge
                  tone={outcome === null ? 'neutral' : outcome.mode === 'transfer' ? 'success' : 'warn'}
                >
                  {outcome === null
                    ? 'No run yet'
                    : outcome.mode === 'transfer'
                      ? 'Transfer'
                      : 'Structured clone'}
                </StatusBadge>
              </div>

              <ProgressBar
                value={busy === null ? (outcome === null ? 0 : 1) : progress ?? 0}
                tone={outcome?.mode === 'transfer' ? 'success' : 'accent'}
              />

              <div className="stat-grid">
                <Stat
                  label="Checksum"
                  value={outcome === null ? '—' : outcome.total.toFixed(2)}
                  tone="accent"
                />
                <Stat
                  label="Wall time"
                  value={outcome === null ? '—' : `${outcome.durationMs.toFixed(0)} ms`}
                />
                <Stat
                  label="Worker received"
                  value={outcome === null ? '—' : formatBytes(outcome.bytes)}
                />
                <Stat
                  label="Sender buffer"
                  value={
                    outcome === null
                      ? '—'
                      : outcome.detached
                        ? 'Detached'
                        : formatBytes(outcome.bytes)
                  }
                  tone={outcome?.detached === true ? 'success' : 'default'}
                />
              </div>

              {error === null ? null : <p className="error-line">{error}</p>}
            </div>
          </div>

          <div className="transfer-visual">
            <div className={`transfer-node${busy !== null ? ' is-active' : ''}`}>
              <span className="transfer-node__title">Main thread</span>
              <span className="transfer-node__meta">
                {outcome?.detached === true ? 'buffer detached' : 'owns the buffer'}
              </span>
            </div>
            <div className="transfer-arrow">
              <span>{outcome?.mode === 'transfer' ? 'transfer' : 'clone'}</span>
              <i />
            </div>
            <div className={`transfer-node${busy !== null ? ' is-active' : ''}`}>
              <span className="transfer-node__title">Worker</span>
              <span className="transfer-node__meta">reads the bytes</span>
            </div>
          </div>
        </div>
      </div>

      <CodeBlock code={source} title="TransferDemo.tsx" />
    </div>
  )
}
