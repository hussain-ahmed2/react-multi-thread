import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useWorkerPool } from 'react-threaded'
import { CodeBlock } from '../components/CodeBlock'
import { RocketIcon } from '../components/Icons'
import { Stat } from '../components/Stat'
import { StatusBadge } from '../components/StatusBadge'
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  createArena,
  drawArena,
  resetArena,
  stepArena,
  stepArenaControls,
  stepArenaProjectiles,
} from './arena-simulation'
import type { ArenaState } from './arena-simulation'
import type { ArenaChunkInput } from '../workers/definitions'
import { arenaChunkWorker } from '../workers/definitions'

const counts = [1_200, 2_400, 3_600, 4_800] as const
const poolSizes = [1, 2, 4, 8] as const
const defaultCount = counts[1]

type Engine = 'pool' | 'main'

type Metrics = {
  readonly fps: number
  readonly uiFps: number
  readonly simulationMs: number
  readonly enemies: number
}

const emptyMetrics: Metrics = { fps: 0, uiFps: 0, simulationMs: 0, enemies: 0 }

const source = `const arenaChunk = createWorker(({ buffer, count, start, end, ...input }) => {
  const enemies = new Float32Array(buffer)
  const output = new Float32Array((end - start) * 4)

  for (let i = start; i < end; i += 1) {
    const offset = i * 6
    const x = enemies[offset]
    const y = enemies[offset + 1]
    let separationX = 0
    let separationY = 0

    for (let j = 0; j < count; j += 1) {
      if (i === j) continue

      const dx = enemies[j * 6] - x
      const dy = enemies[j * 6 + 1] - y
      const distance = dx * dx + dy * dy

      if (distance > 0 && distance < 26 * 26) {
        const inverse = 1 / Math.sqrt(distance)
        separationX -= dx * inverse
        separationY -= dy * inverse
      }
    }

    // chase the player, add separation, write the next x / y / vx / vy...
  }

  return { buffer: output.buffer }
})

const pool = useWorkerPool(arenaChunk, { size: 4 })
const chunks = Array.from({ length: 4 }, (_, index) => ({
  start: Math.floor((count * index) / 4),
  end: Math.floor((count * (index + 1)) / 4),
}))

const results = await pool.map(chunks.map(({ start, end }) => ({
  buffer: enemies.buffer,
  count,
  width,
  height,
  playerX,
  playerY,
  dt: 1 / 60,
  start,
  end,
})))

results.forEach((result, index) => {
  const view = new Float32Array(result.buffer)
  const chunk = chunks[index]

  for (let i = 0; i < view.length / 4; i += 1) {
    const target = (chunk.start + i) * 6
    enemies[target] = view[i * 4]
    enemies[target + 1] = view[i * 4 + 1]
    enemies[target + 2] = view[i * 4 + 2]
    enemies[target + 3] = view[i * 4 + 3]
  }
})`

function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

export function CanvasDemo() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const arenaRef = useRef<ArenaState | null>(null)

  if (arenaRef.current === null) {
    arenaRef.current = createArena(defaultCount)
  }

  const arena = arenaRef.current
  const targetRef = useRef<{ readonly x: number; readonly y: number } | null>(null)
  const pulseIdRef = useRef(0)
  const resetVersionRef = useRef(0)
  const [engine, setEngine] = useState<Engine>('pool')
  const [enemyCount, setEnemyCount] = useState<number>(defaultCount)
  const [poolSize, setPoolSize] = useState<number>(4)
  const [running, setRunning] = useState(false)
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics)
  const [heartbeat, setHeartbeat] = useState(0)
  const pool = useWorkerPool(arenaChunkWorker, { size: poolSize })
  const { map } = pool

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (canvas === null) return

    const context = canvas.getContext('2d')
    if (context === null) return

    drawArena(context, arena)
  }, [arena])

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
    resetVersionRef.current += 1
    resetArena(arena, enemyCount)
    setMetrics(emptyMetrics)
    drawFrame()
  }, [enemyCount, arena, drawFrame])

  useEffect(() => {
    if (!running) return

    let cancelled = false
    let inFlight = false
    let frameHandle = 0
    let simulationFrames = 0
    let simulationTotal = 0
    let uiFrames = 0
    let windowStartedAt = performance.now()
    let lastStepAt = performance.now()
    let lastPulseId = pulseIdRef.current

    const publishMetrics = (): void => {
      const now = performance.now()
      const elapsed = now - windowStartedAt

      if (elapsed < 400) return

      setMetrics({
        fps: (simulationFrames * 1000) / elapsed,
        uiFps: (uiFrames * 1000) / elapsed,
        simulationMs: simulationFrames === 0 ? 0 : simulationTotal / simulationFrames,
        enemies: arena.enemyCount,
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

    const currentTarget = (): { readonly x: number; readonly y: number } =>
      targetRef.current ?? { x: arena.playerX, y: arena.playerY }

    const currentDt = (now: number): number => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastStepAt) / 1000))
      lastStepAt = now
      return dt
    }

    const submitPoolFrame = (): void => {
      if (cancelled || inFlight) return

      inFlight = true
      const requestVersion = resetVersionRef.current
      const startedAt = performance.now()
      const now = startedAt
      const dt = currentDt(now)
      const target = currentTarget()
      const pulse = pulseIdRef.current !== lastPulseId
      lastPulseId = pulseIdRef.current

      stepArenaControls(arena, target.x, target.y, pulse, dt)

      if (arena.playerHp <= 0 || arena.enemyCount === 0) {
        inFlight = false
        stepArenaProjectiles(arena, dt)
        const simulationMs = performance.now() - startedAt
        drawFrame()
        recordSimulation(simulationMs)
        return
      }

      const count = arena.enemyCount
      const chunkSize = Math.ceil(count / poolSize)
      const chunks = Array.from({ length: poolSize }, (_, index) => ({
        start: index * chunkSize,
        end: Math.min(count, (index + 1) * chunkSize),
      })).filter((chunk) => chunk.start < chunk.end)

      const inputs: ArenaChunkInput[] = chunks.map((chunk) => ({
        buffer: arena.enemies.buffer as ArrayBuffer,
        count,
        width: ARENA_WIDTH,
        height: ARENA_HEIGHT,
        playerX: arena.playerX,
        playerY: arena.playerY,
        dt,
        start: chunk.start,
        end: chunk.end,
      }))

      map(inputs)
        .then((results) => {
          inFlight = false

          if (cancelled || requestVersion !== resetVersionRef.current) return

          results.forEach((result, index) => {
            const chunk = chunks[index]
            if (chunk === undefined) return

            const view = new Float32Array(result.buffer)

            for (let item = 0; item < view.length / 4; item += 1) {
              const targetOffset = (chunk.start + item) * 6
              const sourceOffset = item * 4

              arena.enemies[targetOffset] = view[sourceOffset]!
              arena.enemies[targetOffset + 1] = view[sourceOffset + 1]!
              arena.enemies[targetOffset + 2] = view[sourceOffset + 2]!
              arena.enemies[targetOffset + 3] = view[sourceOffset + 3]!
            }
          })

          stepArenaProjectiles(arena, dt)
          const simulationMs = performance.now() - startedAt
          drawFrame()
          recordSimulation(simulationMs)
        })
        .catch(() => {
          inFlight = false
        })
    }

    const stepMainFrame = (): void => {
      const startedAt = performance.now()
      const dt = currentDt(startedAt)
      const target = currentTarget()
      const pulse = pulseIdRef.current !== lastPulseId
      lastPulseId = pulseIdRef.current

      stepArena(arena, target.x, target.y, pulse, dt)
      const simulationMs = performance.now() - startedAt
      drawFrame()
      recordSimulation(simulationMs)
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

      stepMainFrame()
    }

    frameHandle = requestAnimationFrame(loop)

    return (): void => {
      cancelled = true
      cancelAnimationFrame(frameHandle)
    }
  }, [running, engine, poolSize, arena, drawFrame, map])

  const reset = (): void => {
    resetVersionRef.current += 1
    resetArena(arena, enemyCount)
    setMetrics(emptyMetrics)
    drawFrame()
  }

  const pulse = (): void => {
    pulseIdRef.current += 1
  }

  const updateTarget = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect()

    targetRef.current = {
      x: ((event.clientX - rect.left) / rect.width) * ARENA_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * ARENA_HEIGHT,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    updateTarget(event)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    updateTarget(event)
    pulse()
  }

  const handlePointerLeave = (): void => {
    targetRef.current = null
  }

  const blocking = running && engine === 'main'
  const status = running ? (blocking ? 'Blocking UI' : 'Off-thread pool') : 'Paused'
  const statusTone = blocking ? 'danger' : running ? 'success' : 'neutral'

  return (
    <div className="demo">
      <div className="demo__intro">
        <div className="demo__eyebrow">
          <RocketIcon width={16} height={16} />
          Canvas action game + worker pool
        </div>
        <h2>Neon Siege: keep the arena smooth under pressure.</h2>
        <p>
          {formatNumber(enemyCount)} enemies chase the player and separate from every other enemy —
          that is {formatNumber(enemyCount * enemyCount)} steering checks per frame. The pool splits
          the horde across {poolSize} workers while the main thread runs input, bullets, collisions,
          and paint. Switch the same arena to the main thread and every dropped frame is felt.
        </p>
      </div>

      <div className="demo__grid demo__grid--sidebar">
        <div className="panel">
          <div className="panel__head">
            <span className="panel__title">Arena</span>
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
                ? `Enemy steering runs across ${poolSize} worker${poolSize === 1 ? '' : 's'}; the main thread owns input, bullets, and paint.`
                : 'Enemy steering, bullets, input, and paint share one thread. Expect the arena to fight the page.'}
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
            <span className="field__label">Enemies</span>
            <div className="segmented" role="group" aria-label="Enemy count">
              {counts.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`segmented__item${option === enemyCount ? ' is-active' : ''}`}
                  onClick={() => setEnemyCount(option)}
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
              {running ? 'Pause' : 'Start game'}
            </button>
            <button type="button" className="button" onClick={pulse}>
              Pulse
            </button>
            <button type="button" className="button" onClick={reset}>
              Reset
            </button>
          </div>

          <p className="hint">
            Move the pointer over the arena to steer. Click the canvas or press Pulse to fire a
            shockwave. Auto-fire is always on. The heartbeat is a main-thread timer; UI FPS counts
            main-thread animation frames. 2,400 enemies is the default; 4,800 is a stress test.
          </p>
        </div>

        <div className="stack">
          <div className="arena-stage">
            <canvas
              ref={canvasRef}
              className="arena-canvas"
              aria-label="Neon Siege action game"
              onPointerMove={handlePointerMove}
              onPointerDown={handlePointerDown}
              onPointerLeave={handlePointerLeave}
            />
            <div className="arena-stage__hud">
              <span className="arena-pill">
                <i className={heartbeat % 2 === 0 ? 'is-on' : ''} aria-hidden="true" />
                UI heartbeat {heartbeat}
              </span>
              <span className="arena-pill">
                {metrics.fps === 0 ? 'arena idle' : `${Math.round(metrics.fps)} game fps`}
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
                  ? `Each worker returns a slice of the next enemy positions; the main thread merges ${poolSize} buffer${poolSize === 1 ? '' : 's'}, updates bullets, and paints.`
                  : 'Enemy steering runs inside requestAnimationFrame on the main thread. A slow frame delays input, bullets, React updates, and the next paint.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <CodeBlock code={source} title="NeonSiege.tsx" />
    </div>
  )
}
