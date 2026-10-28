import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useWorkerPool } from 'react-threaded'
import { CodeBlock } from '../components/CodeBlock'
import { RocketIcon } from '../components/Icons'
import { Stat } from '../components/Stat'
import { StatusBadge } from '../components/StatusBadge'
import {
  SWARM_HEIGHT,
  SWARM_WIDTH,
  createSwarm,
  drawSwarm,
  stepSwarm,
} from './swarm-simulation'
import type { SwarmChunkInput } from '../workers/definitions'
import { swarmChunkWorker } from '../workers/definitions'

const counts = [1_200, 2_400, 4_000, 6_000] as const
const poolSizes = [1, 2, 4, 8] as const

type Engine = 'pool' | 'main'

type Metrics = {
  readonly fps: number
  readonly uiFps: number
  readonly simulationMs: number
}

const emptyMetrics: Metrics = { fps: 0, uiFps: 0, simulationMs: 0 }

const source = `const swarmChunk = createWorker(({ buffer, count, start, end, ...input }) => {
  const boids = new Float32Array(buffer)
  const output = new Float32Array((end - start) * 4)
  let checks = 0

  for (let i = start; i < end; i += 1) {
    const offset = i * 4

    for (let j = 0; j < count; j += 1) {
      if (i === j) continue
      checks += 1

      // alignment, cohesion, separation, edges, pointer repel...
    }

    // write nextX / nextY / nextVx / nextVy into output...
  }

  return { buffer: output.buffer, checks }
})

let boids = new Float32Array(count * 4)
const pool = useWorkerPool(swarmChunk, { size: 4 })
const chunks = Array.from({ length: 4 }, (_, index) => ({
  start: Math.floor((count * index) / 4),
  end: Math.floor((count * (index + 1)) / 4),
}))

const results = await pool.map(chunks.map(({ start, end }) => ({
  buffer: boids.buffer,
  count,
  width,
  height,
  pointerX,
  pointerY,
  dt: 1 / 60,
  start,
  end,
})))

const next = new Float32Array(count * 4)
results.forEach((result, index) => {
  next.set(new Float32Array(result.buffer), chunks[index].start * 4)
})

boids = next`

function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

export function CanvasDemo() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const boidsRef = useRef<Float32Array>(createSwarm(counts[2]))
  const pointerRef = useRef<{ readonly x: number; readonly y: number } | null>(null)
  const resetVersionRef = useRef(0)
  const [engine, setEngine] = useState<Engine>('pool')
  const [boidCount, setBoidCount] = useState<number>(counts[2])
  const [poolSize, setPoolSize] = useState<number>(4)
  const [running, setRunning] = useState(false)
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics)
  const [heartbeat, setHeartbeat] = useState(0)
  const pool = useWorkerPool(swarmChunkWorker, { size: poolSize })
  const { map } = pool

  const drawFrame = useCallback((trailAlpha = 0.28) => {
    const canvas = canvasRef.current
    if (canvas === null) return

    const context = canvas.getContext('2d')
    if (context === null) return

    drawSwarm(
      context,
      boidsRef.current,
      boidsRef.current.length / 4,
      SWARM_WIDTH,
      SWARM_HEIGHT,
      pointerRef.current?.x ?? null,
      pointerRef.current?.y ?? null,
      trailAlpha,
    )
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeartbeat((value) => value + 1)
    }, 120)

    return (): void => {
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) return

    const resize = (): void => {
      const rect = canvas.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 2)

      canvas.width = Math.max(1, Math.round(rect.width * ratio))
      canvas.height = Math.max(1, Math.round(rect.height * ratio))
      drawFrame()
    }

    resize()

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    return (): void => {
      observer.disconnect()
    }
  }, [drawFrame])

  useEffect(() => {
    boidsRef.current = createSwarm(boidCount)
    drawFrame(1)
  }, [boidCount, drawFrame])

  useEffect(() => {
    if (!running) return

    let cancelled = false
    let inFlight = false
    let frameHandle = 0
    let simulationFrames = 0
    let simulationTotal = 0
    let uiFrames = 0
    let windowStartedAt = performance.now()

    const publishMetrics = (): void => {
      const now = performance.now()
      const elapsed = now - windowStartedAt

      if (elapsed < 400) return

      setMetrics({
        fps: (simulationFrames * 1000) / elapsed,
        uiFps: (uiFrames * 1000) / elapsed,
        simulationMs: simulationFrames === 0 ? 0 : simulationTotal / simulationFrames,
      })

      simulationFrames = 0
      simulationTotal = 0
      uiFrames = 0
      windowStartedAt = now
    }

    const recordSimulation = (simulationMs: number): void => {
      simulationFrames += 1
      simulationTotal += simulationMs
    }

    const submitPoolFrame = (): void => {
      if (cancelled || inFlight) return

      inFlight = true
      const requestVersion = resetVersionRef.current
      const startedAt = performance.now()
      const chunkSize = Math.ceil(boidCount / poolSize)
      const chunks = Array.from({ length: poolSize }, (_, index) => ({
        start: index * chunkSize,
        end: Math.min(boidCount, (index + 1) * chunkSize),
      })).filter((chunk) => chunk.start < chunk.end)

      const inputs: SwarmChunkInput[] = chunks.map((chunk) => ({
        buffer: boidsRef.current.buffer as ArrayBuffer,
        count: boidCount,
        width: SWARM_WIDTH,
        height: SWARM_HEIGHT,
        pointerX: pointerRef.current?.x ?? null,
        pointerY: pointerRef.current?.y ?? null,
        dt: 1 / 60,
        start: chunk.start,
        end: chunk.end,
      }))

      map(inputs)
        .then((results) => {
          inFlight = false

          if (cancelled || requestVersion !== resetVersionRef.current) return

          const next = new Float32Array(boidCount * 4)

          results.forEach((result, index) => {
            const chunk = chunks[index]
            if (chunk === undefined) return

            next.set(new Float32Array(result.buffer), chunk.start * 4)
          })

          boidsRef.current = next
          drawFrame()
          recordSimulation(performance.now() - startedAt)
        })
        .catch(() => {
          inFlight = false
        })
    }

    const loop = (): void => {
      if (cancelled) return

      frameHandle = requestAnimationFrame(loop)
      uiFrames += 1
      publishMetrics()

      if (engine === 'pool') {
        submitPoolFrame()
        return
      }

      const startedAt = performance.now()

      stepSwarm(
        boidsRef.current,
        boidCount,
        SWARM_WIDTH,
        SWARM_HEIGHT,
        pointerRef.current?.x ?? null,
        pointerRef.current?.y ?? null,
        1 / 60,
      )

      drawFrame()
      recordSimulation(performance.now() - startedAt)
    }

    frameHandle = requestAnimationFrame(loop)

    return (): void => {
      cancelled = true
      cancelAnimationFrame(frameHandle)
    }
  }, [running, engine, boidCount, poolSize, drawFrame, map])

  const reset = (): void => {
    resetVersionRef.current += 1
    boidsRef.current = createSwarm(boidCount)
    setMetrics(emptyMetrics)
    drawFrame(1)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect()

    pointerRef.current = {
      x: ((event.clientX - rect.left) / rect.width) * SWARM_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * SWARM_HEIGHT,
    }
  }

  const handlePointerLeave = (): void => {
    pointerRef.current = null
  }

  const blocking = running && engine === 'main'
  const status = running ? (blocking ? 'Blocking UI' : 'Off-thread pool') : 'Paused'
  const statusTone = blocking ? 'danger' : running ? 'success' : 'neutral'

  return (
    <div className="demo">
      <div className="demo__intro">
        <div className="demo__eyebrow">
          <RocketIcon width={16} height={16} />
          Canvas + O(n²) neighbor search
        </div>
        <h2>A game loop that can actually drop frames.</h2>
        <p>
          Every tick compares {formatNumber(boidCount)} boids against every other boid —{' '}
          {formatNumber(boidCount * boidCount)} neighbor checks per frame — then steers them around
          the cursor. Spread it across {poolSize} workers and the page keeps painting. Switch to
          the main thread and the same loop fights React, input, and the browser for one CPU core.
        </p>
      </div>

      <div className="demo__grid demo__grid--sidebar">
        <div className="panel">
          <div className="panel__head">
            <span className="panel__title">Simulation</span>
            <StatusBadge tone={statusTone} pulse={running}>
              {status}
            </StatusBadge>
          </div>

          <div className="field">
            <span className="field__label">Compute on</span>
            <div className="segmented" role="group" aria-label="Simulation thread">
              <button
                type="button"
                className={`segmented__item${engine === 'pool' ? ' is-active' : ''}`}
                onClick={() => setEngine('pool')}
              >
                Worker pool
              </button>
              <button
                type="button"
                className={`segmented__item${engine === 'main' ? ' is-active' : ''}`}
                onClick={() => setEngine('main')}
              >
                Main thread
              </button>
            </div>
            <span className="field__hint">
              {engine === 'pool'
                ? `The pool splits the neighbor search across ${poolSize} worker${poolSize === 1 ? '' : 's'}; the main thread merges and paints.`
                : 'Calculation, React, and painting share one thread. Expect jank.'}
            </span>
          </div>

          {engine === 'pool' ? (
            <div className="field">
              <span className="field__label">Workers</span>
              <div className="segmented" role="group" aria-label="Worker pool size">
                {poolSizes.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`segmented__item${option === poolSize ? ' is-active' : ''}`}
                    onClick={() => setPoolSize(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="field">
            <span className="field__label">Boids</span>
            <div className="segmented" role="group" aria-label="Boid count">
              {counts.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`segmented__item${option === boidCount ? ' is-active' : ''}`}
                  onClick={() => setBoidCount(option)}
                >
                  {formatNumber(option)}
                </button>
              ))}
            </div>
          </div>

          <div className="button-row">
            <button
              type="button"
              className="button button--primary"
              onClick={() => setRunning((value) => !value)}
            >
              {running ? 'Pause' : 'Start simulation'}
            </button>
            <button type="button" className="button" onClick={reset}>
              Reset
            </button>
          </div>

          <p className="hint">
            Move the pointer over the canvas to repel the swarm. The heartbeat uses a main-thread
            timer, and UI FPS counts main-thread animation frames. Watch both collapse when the
            simulation moves onto the main thread.
          </p>
        </div>

        <div className="stack">
          <div className="swarm-stage">
            <canvas
              ref={canvasRef}
              className="swarm-canvas"
              aria-label="Animated boid simulation"
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
            />
            <div className="swarm-stage__hud">
              <span className="swarm-pill">
                <i className={heartbeat % 2 === 0 ? 'is-on' : ''} aria-hidden="true" />
                UI heartbeat {heartbeat}
              </span>
              <span className="swarm-pill">
                {metrics.fps === 0 ? 'sim idle' : `${Math.round(metrics.fps)} sim fps`}
              </span>
            </div>
          </div>

          <div className="panel panel--flush">
            <div className="result-card">
              <div className="result-card__head">
                <span className="result-card__label">Last 400 ms</span>
                <StatusBadge tone={statusTone} pulse={running}>
                  {engine === 'pool' ? 'Off-thread pool' : 'On-thread compute'}
                </StatusBadge>
              </div>

              <div className="stat-grid stat-grid--compact">
                <Stat
                  label="Simulation"
                  value={metrics.simulationMs === 0 ? '—' : `${metrics.simulationMs.toFixed(1)} ms`}
                  tone={blocking ? 'danger' : 'success'}
                />
                <Stat
                  label="Sim FPS"
                  value={metrics.fps === 0 ? '—' : Math.round(metrics.fps).toString()}
                  tone={blocking ? 'danger' : 'accent'}
                />
                <Stat
                  label="UI FPS"
                  value={metrics.uiFps === 0 ? '—' : Math.round(metrics.uiFps).toString()}
                  tone={metrics.uiFps < 50 ? 'danger' : 'success'}
                />
                <Stat
                  label="Workers"
                  value={engine === 'pool' ? poolSize : 1}
                  tone={engine === 'pool' ? 'success' : 'danger'}
                />
              </div>

              <p className="hint hint--tight">
                {engine === 'pool'
                  ? `Each worker returns a slice of the next frame; the main thread only merges ${poolSize} buffer${poolSize === 1 ? '' : 's'} and paints.`
                  : 'The simulation runs inside requestAnimationFrame on the main thread. A slow frame delays input, React updates, and the next paint.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <CodeBlock code={source} title="CanvasSwarm.tsx" />
    </div>
  )
}
