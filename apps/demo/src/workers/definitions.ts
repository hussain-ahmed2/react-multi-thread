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
/* Canvas swarm                                                               */
/* -------------------------------------------------------------------------- */

export type SwarmChunkInput = {
  readonly buffer: ArrayBuffer
  readonly count: number
  readonly width: number
  readonly height: number
  readonly pointerX: number | null
  readonly pointerY: number | null
  readonly dt: number
  readonly start: number
  readonly end: number
}

export type SwarmChunkOutput = {
  readonly buffer: ArrayBuffer
  readonly checks: number
  readonly simulationMs: number
}

export const swarmChunkWorker = createWorker(
  (input: SwarmChunkInput): SwarmChunkOutput => {
    const startedAt = performance.now()
    const boids = new Float32Array(input.buffer)
    const output = new Float32Array((input.end - input.start) * 4)
    const count = input.count
    const width = input.width
    const height = input.height
    const pointerX = input.pointerX
    const pointerY = input.pointerY
    const dt = input.dt
    const stride = 4
    const vision = 52
    const visionSquared = vision * vision
    const separationSquared = 20 * 20
    const maxSpeed = 132
    const maxForce = 118
    const edge = 44
    const pointerRadiusSquared = 118 * 118
    let checks = 0

    for (let index = input.start; index < input.end; index += 1) {
      const offset = index * stride
      const x = boids[offset]!
      const y = boids[offset + 1]!
      const vx = boids[offset + 2]!
      const vy = boids[offset + 3]!
      let alignX = 0
      let alignY = 0
      let cohesionX = 0
      let cohesionY = 0
      let separationX = 0
      let separationY = 0
      let neighbors = 0

      for (let otherIndex = 0; otherIndex < count; otherIndex += 1) {
        if (otherIndex === index) continue

        const otherOffset = otherIndex * stride
        const dx = boids[otherOffset]! - x
        const dy = boids[otherOffset + 1]! - y
        const distanceSquared = dx * dx + dy * dy

        checks += 1

        if (distanceSquared > visionSquared || distanceSquared === 0) continue

        alignX += boids[otherOffset + 2]!
        alignY += boids[otherOffset + 3]!
        cohesionX += dx
        cohesionY += dy
        neighbors += 1

        if (distanceSquared < separationSquared) {
          const inverseDistance = 1 / Math.sqrt(distanceSquared)
          separationX -= dx * inverseDistance
          separationY -= dy * inverseDistance
        }
      }

      let accelerationX = 0
      let accelerationY = 0

      if (neighbors > 0) {
        accelerationX += (alignX / neighbors) * 1.15 + (cohesionX / neighbors) * 0.42
        accelerationY += (alignY / neighbors) * 1.15 + (cohesionY / neighbors) * 0.42
      }

      accelerationX += separationX * 1.8
      accelerationY += separationY * 1.8

      if (x < edge) accelerationX += (edge - x) * 3.4
      if (x > width - edge) accelerationX -= (x - (width - edge)) * 3.4
      if (y < edge) accelerationY += (edge - y) * 3.4
      if (y > height - edge) accelerationY -= (y - (height - edge)) * 3.4

      if (pointerX !== null && pointerY !== null) {
        const pointerDx = x - pointerX
        const pointerDy = y - pointerY
        const pointerDistanceSquared = pointerDx * pointerDx + pointerDy * pointerDy

        if (pointerDistanceSquared > 0 && pointerDistanceSquared < pointerRadiusSquared) {
          const inverseDistance = 1 / Math.sqrt(pointerDistanceSquared)
          const strength = (1 - pointerDistanceSquared / pointerRadiusSquared) * 620
          accelerationX += pointerDx * inverseDistance * strength
          accelerationY += pointerDy * inverseDistance * strength
        }
      }

      const force = Math.hypot(accelerationX, accelerationY)

      if (force > maxForce) {
        const scale = maxForce / force
        accelerationX *= scale
        accelerationY *= scale
      }

      let nextVx = vx + accelerationX * dt
      let nextVy = vy + accelerationY * dt
      const speed = Math.hypot(nextVx, nextVy)

      if (speed > maxSpeed) {
        const scale = maxSpeed / speed
        nextVx *= scale
        nextVy *= scale
      }

      let nextX = x + nextVx * dt
      let nextY = y + nextVy * dt

      if (nextX < 0) {
        nextX = 0
        nextVx = Math.abs(nextVx)
      } else if (nextX > width) {
        nextX = width
        nextVx = -Math.abs(nextVx)
      }

      if (nextY < 0) {
        nextY = 0
        nextVy = Math.abs(nextVy)
      } else if (nextY > height) {
        nextY = height
        nextVy = -Math.abs(nextVy)
      }

      const outputOffset = (index - input.start) * stride
      output[outputOffset] = nextX
      output[outputOffset + 1] = nextY
      output[outputOffset + 2] = nextVx
      output[outputOffset + 3] = nextVy
    }

    return {
      buffer: output.buffer,
      checks,
      simulationMs: performance.now() - startedAt,
    }
  },
)
