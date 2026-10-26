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
