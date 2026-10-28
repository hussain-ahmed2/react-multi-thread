/**
 * Live worker definitions used by the demo.
 *
 * Every function passed to `createWorker` is serialised and executed in an
 * isolated worker. That means it must be self-contained: no imports, no
 * closures over module variables, and no references to React state.
 */

import { createSharedAtom, createWorker } from 'react-threaded'

/* -------------------------------------------------------------------------- */
/* Prime sieve                                                                */
/* -------------------------------------------------------------------------- */

export type PrimeResult = {
  readonly count: number
  readonly cancelled: boolean
}

export const primeWorker = createWorker(
  async (limit: number, context): Promise<PrimeResult> => {
    const composite = new Uint8Array(limit + 1)
    const progressStep = Math.max(1, Math.floor(limit / 20))
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

      if (value % progressStep === 0) {
        context.progress(value / limit)

        if (context.cancelled) {
          return { count, cancelled: true }
        }

        // Yield so cancellation messages and cooperative checks stay responsive.
        await context.yield()
      }
    }

    context.progress(1)
    return { count, cancelled: false }
  },
)

/* -------------------------------------------------------------------------- */
/* Transferables                                                              */
/* -------------------------------------------------------------------------- */

export type ChecksumInput = {
  readonly buffer: ArrayBuffer
  readonly passes: number
}

export type ChecksumOutput = {
  readonly total: number
  readonly length: number
  readonly bytes: number
}

export const checksumWorker = createWorker(
  (input: ChecksumInput, context): ChecksumOutput => {
    const view = new Float64Array(input.buffer)
    let total = 0

    for (let pass = 0; pass < input.passes; pass += 1) {
      for (const value of view) {
        total += Math.sqrt(Math.abs(value))
      }

      context.progress((pass + 1) / input.passes)
    }

    return {
      total,
      length: view.length,
      bytes: input.buffer.byteLength,
    }
  },
)

/* -------------------------------------------------------------------------- */
/* Worker pool                                                                */
/* -------------------------------------------------------------------------- */

export type CrunchInput = {
  readonly id: number
  readonly iterations: number
}

export type CrunchOutput = {
  readonly id: number
  readonly hash: number
  readonly durationMs: number
}

export const crunchWorker = createWorker((input: CrunchInput): CrunchOutput => {
  const startedAt = performance.now()
  let hash = 2166136261

  for (let index = 0; index < input.iterations; index += 1) {
    hash ^= (index + input.id) & 0xff
    hash = Math.imul(hash, 16777619)
  }

  return {
    id: input.id,
    hash: hash >>> 0,
    durationMs: performance.now() - startedAt,
  }
})

/* -------------------------------------------------------------------------- */
/* Shared atomics                                                             */
/* -------------------------------------------------------------------------- */

export const sharedCounter = createSharedAtom(0, {
  name: 'react-threaded-demo-shared-counter',
})

export type SharedIncrementInput = {
  readonly buffer: SharedArrayBuffer | null
  readonly iterations: number
  readonly workerId: number
}

export type SharedIncrementOutput = {
  readonly workerId: number
  readonly local: number
}

export const sharedIncrementWorker = createWorker(
  (input: SharedIncrementInput, context): SharedIncrementOutput => {
    if (input.buffer === null) {
      let local = 0

      for (let index = 0; index < input.iterations; index += 1) {
        local += 1
      }

      return { workerId: input.workerId, local }
    }

    const view = new Int32Array(input.buffer)

    for (let index = 0; index < input.iterations; index += 1) {
      Atomics.add(view, 0, 1)

      if ((index & 0x3ffff) === 0) {
        context.progress(index / input.iterations)

        if (context.cancelled) break
      }
    }

    return { workerId: input.workerId, local: 0 }
  },
)

/* -------------------------------------------------------------------------- */
/* Comlink-style proxy                                                        */
/* -------------------------------------------------------------------------- */

export type StatsOutput = {
  readonly sum: number
  readonly min: number
  readonly max: number
  readonly mean: number
}

export const mathWorker = createWorker({
  fibonacci(n: number): string {
    let previous = 0n
    let current = 1n

    for (let index = 0; index < n; index += 1) {
      const next = previous + current
      previous = current
      current = next
    }

    return previous.toString()
  },

  hash(input: string): string {
    let hash = 2166136261

    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index)
      hash = Math.imul(hash, 16777619)
    }

    return (hash >>> 0).toString(16).padStart(8, '0')
  },

  stats(values: readonly number[]): StatsOutput {
    let sum = 0
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY

    for (const value of values) {
      sum += value
      if (value < min) min = value
      if (value > max) max = value
    }

    return {
      sum,
      min: values.length > 0 ? min : 0,
      max: values.length > 0 ? max : 0,
      mean: values.length > 0 ? sum / values.length : 0,
    }
  },
})

/* -------------------------------------------------------------------------- */
/* Canvas arena                                                               */
/* -------------------------------------------------------------------------- */

export type ArenaChunkInput = {
  readonly buffer: ArrayBuffer
  readonly count: number
  readonly width: number
  readonly height: number
  readonly playerX: number
  readonly playerY: number
  readonly dt: number
  readonly start: number
  readonly end: number
}

export type ArenaChunkOutput = {
  readonly buffer: ArrayBuffer
  readonly simulationMs: number
}

export const arenaChunkWorker = createWorker(
  (input: ArenaChunkInput): ArenaChunkOutput => {
    const startedAt = performance.now()
    const enemies = new Float32Array(input.buffer)
    const output = new Float32Array((input.end - input.start) * 4)
    const count = input.count
    const width = input.width
    const height = input.height
    const playerX = input.playerX
    const playerY = input.playerY
    const dt = input.dt
    const stride = 6
    const separation = 26
    const separationSquared = separation * separation

    for (let index = input.start; index < input.end; index += 1) {
      const offset = index * stride
      let x = enemies[offset]!
      let y = enemies[offset + 1]!
      let vx = enemies[offset + 2]!
      let vy = enemies[offset + 3]!
      const kind = enemies[offset + 5]!
      let separationX = 0
      let separationY = 0

      for (let otherIndex = 0; otherIndex < count; otherIndex += 1) {
        if (otherIndex === index) continue

        const otherOffset = otherIndex * stride
        const dx = enemies[otherOffset]! - x
        const dy = enemies[otherOffset + 1]! - y
        const distanceSquared = dx * dx + dy * dy

        if (distanceSquared === 0 || distanceSquared > separationSquared) continue

        const inverseDistance = 1 / Math.sqrt(distanceSquared)
        separationX -= dx * inverseDistance
        separationY -= dy * inverseDistance
      }

      const dx = playerX - x
      const dy = playerY - y
      const distance = Math.hypot(dx, dy)
      const speed = kind === 2 ? 28 : kind === 1 ? 74 : 46
      const desiredX = (distance > 0 ? (dx / distance) * speed : 0) + separationX * 34
      const desiredY = (distance > 0 ? (dy / distance) * speed : 0) + separationY * 34
      const steer = Math.min(1, dt * 4.5)

      vx += (desiredX - vx) * steer
      vy += (desiredY - vy) * steer
      x = Math.max(0, Math.min(width, x + vx * dt))
      y = Math.max(0, Math.min(height, y + vy * dt))

      const outputOffset = (index - input.start) * 4
      output[outputOffset] = x
      output[outputOffset + 1] = y
      output[outputOffset + 2] = vx
      output[outputOffset + 3] = vy
    }

    return {
      buffer: output.buffer,
      simulationMs: performance.now() - startedAt,
    }
  },
)
