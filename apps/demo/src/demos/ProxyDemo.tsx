import { useState } from 'react'
import { useWorkerProxy } from 'react-threaded'
import { CodeBlock } from '../components/CodeBlock'
import { ThreadIcon } from '../components/Icons'
import { Stat } from '../components/Stat'
import { StatusBadge } from '../components/StatusBadge'
import type { StatsOutput } from '../workers/definitions'
import { mathWorker } from '../workers/definitions'

const fibonacciOptions = [10_000, 50_000, 100_000] as const

const source = `const mathWorker = createWorker({
  fibonacci(n: number) {
    let a = 0n
    let b = 1n
    for (let i = 0; i < n; i += 1) [a, b] = [b, a + b]
    return a.toString()
  },

  hash(input: string) { /* ... */ },

  stats(values: readonly number[]) { /* ... */ },
})

function Demo() {
  // Every method becomes a typed async function.
  const api = useWorkerProxy(mathWorker)
  const digits = await api.fibonacci(50_000)
  const hex = await api.hash('hello')
}`

type Outcome = {
  readonly digits: string
  readonly hash: string
  readonly stats: StatsOutput
  readonly durationMs: number
  readonly valueCount: number
}

function buildValues(count: number): number[] {
  return Array.from({ length: count }, (_, index) => Math.sin(index / 97) * 1_000)
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function ProxyDemo() {
  const [fibonacciN, setFibonacciN] = useState<number>(50_000)
  const [text, setText] = useState('react-threaded')
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const api = useWorkerProxy(mathWorker)

  const run = async () => {
    if (busy) return

    setBusy(true)
    setError(null)

    const values = buildValues(25_000)
    const startedAt = performance.now()

    try {
      const [digits, hash, stats] = await Promise.all([
        api.fibonacci(fibonacciN),
        api.hash(text),
        api.stats(values),
      ])

      setOutcome({
        digits,
        hash,
        stats,
        durationMs: performance.now() - startedAt,
        valueCount: values.length,
      })
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const preview =
    outcome === null
      ? null
      : outcome.digits.length > 42
        ? `${outcome.digits.slice(0, 24)}…${outcome.digits.slice(-12)}`
        : outcome.digits

  return (
    <div className="demo">
      <div className="demo__intro">
        <div className="demo__eyebrow">
          <ThreadIcon width={16} height={16} />
          Comlink-style proxy
        </div>
        <h2>A worker that reads like an object.</h2>
        <p>
          Declare a record of methods once and <code>useWorkerProxy</code> turns each one into a
          promise-returning, fully typed function. Calls are ordinary tasks on one worker, so they
          queue safely while sharing cancellation and retry behaviour.
        </p>
      </div>

      <div className="demo__grid demo__grid--sidebar">
        <div className="panel">
          <div className="panel__head">
            <span className="panel__title">Calls</span>
            <StatusBadge tone={busy ? 'info' : 'success'} pulse={busy}>
              {busy ? 'Queued' : 'Ready'}
            </StatusBadge>
          </div>

          <div className="field">
            <span className="field__label">fibonacci(n)</span>
            <div className="segmented" role="group" aria-label="Fibonacci index">
              {fibonacciOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`segmented__item${option === fibonacciN ? ' is-active' : ''}`}
                  onClick={() => setFibonacciN(option)}
                  disabled={busy}
                >
                  {option / 1_000}
                  k
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span className="field__label">hash(input)</span>
            <input
              className="text-input"
              value={text}
              onChange={(event) => setText(event.target.value)}
              disabled={busy}
              spellCheck={false}
              maxLength={120}
            />
          </label>

          <div className="button-row">
            <button type="button" className="button button--primary" onClick={() => void run()} disabled={busy}>
              Run all three
            </button>
          </div>

          <p className="hint">
            Calls target one worker, so they execute in order. Use <code>useWorkerPool</code> when
            you need true parallelism.
          </p>
        </div>

        <div className="stack">
          <div className="panel panel--flush">
            <div className="result-card">
              <div className="result-card__head">
                <span className="result-card__label">Proxy result</span>
                <StatusBadge tone={outcome === null ? 'neutral' : 'success'}>
                  {outcome === null ? 'No calls yet' : `${outcome.durationMs.toFixed(0)} ms`}
                </StatusBadge>
              </div>

              <div className="proxy-result">
                <div className="proxy-result__row">
                  <span className="proxy-result__key">fibonacci({fibonacciN.toLocaleString('en-US')})</span>
                  <code className="proxy-result__value">
                    {preview ?? '—'}
                    {outcome === null ? null : (
                      <em>{outcome.digits.length.toLocaleString('en-US')} digits</em>
                    )}
                  </code>
                </div>

                <div className="proxy-result__row">
                  <span className="proxy-result__key">hash("{text || '…'}")</span>
                  <code className="proxy-result__value">{outcome?.hash ?? '—'}</code>
                </div>

                <div className="proxy-result__row">
                  <span className="proxy-result__key">stats(values)</span>
                  <code className="proxy-result__value">
                    {outcome === null
                      ? '—'
                      : `${outcome.valueCount.toLocaleString('en-US')} values`}
                  </code>
                </div>
              </div>

              <div className="stat-grid">
                <Stat
                  label="Sum"
                  value={outcome === null ? '—' : formatNumber(outcome.stats.sum)}
                  tone="accent"
                />
                <Stat label="Min" value={outcome === null ? '—' : formatNumber(outcome.stats.min)} />
                <Stat label="Max" value={outcome === null ? '—' : formatNumber(outcome.stats.max)} />
                <Stat label="Mean" value={outcome === null ? '—' : formatNumber(outcome.stats.mean)} />
              </div>

              {error === null ? null : <p className="error-line">{error}</p>}
            </div>
          </div>
        </div>
      </div>

      <CodeBlock code={source} title="ProxyDemo.tsx" />
    </div>
  )
}
