import { describe, expect, it } from 'vitest'
import { WorkerPool } from '../../src/features/pool'
import { createWorker } from '../../src/features/worker'
import type { PoolStats } from '../../src/features/pool/types'
import { CancelledError, WorkerDisposedError } from '../../src/shared/errors'
import { registerDefinition } from '../helpers/fake-worker'

type PoolInput = {
  readonly id: number
  readonly waitMs: number
}

const poolWorker = createWorker(async (input: PoolInput) => {
  await new Promise((resolve) => setTimeout(resolve, input.waitMs))
  return input.id * 2
})
registerDefinition(poolWorker)

describe('WorkerPool', () => {
  it('runs tasks concurrently within the configured size', async () => {
    const pool = new WorkerPool(poolWorker, { size: 2 })
    const snapshots: PoolStats[] = []
    const unsubscribe = pool.subscribe((stats) => snapshots.push(stats))

    try {
      const results = await Promise.all([
        pool.run({ id: 1, waitMs: 15 }),
        pool.run({ id: 2, waitMs: 15 }),
        pool.run({ id: 3, waitMs: 15 }),
        pool.run({ id: 4, waitMs: 15 }),
      ])

      expect(results).toEqual([2, 4, 6, 8])
      expect(pool.getStats()).toMatchObject({
        size: 2,
        completed: 4,
        failed: 0,
        cancelled: 0,
        queued: 0,
      })
      expect(pool.getStats().created).toBeLessThanOrEqual(2)
      expect(Math.max(...snapshots.map((stats) => stats.active))).toBeLessThanOrEqual(2)
    } finally {
      unsubscribe()
      pool.terminate()
    }
  })

  it('maps inputs over the pool', async () => {
    const pool = new WorkerPool(poolWorker, { size: 3 })

    try {
      const results = await pool.map([
        { id: 1, waitMs: 1 },
        { id: 2, waitMs: 1 },
        { id: 3, waitMs: 1 },
      ])

      expect(results).toEqual([2, 4, 6])
    } finally {
      pool.terminate()
    }
  })

  it('rejects queued tasks when terminated', async () => {
    const pool = new WorkerPool(poolWorker, { size: 1 })
    const first = pool.run({ id: 1, waitMs: 80 })
    await new Promise((resolve) => setTimeout(resolve, 10))
    const second = pool.run({ id: 2, waitMs: 1 })

    pool.terminate()

    await expect(first).rejects.toBeInstanceOf(WorkerDisposedError)
    await expect(second).rejects.toBeInstanceOf(CancelledError)
    expect(pool.getStats().cancelled).toBeGreaterThanOrEqual(2)
  })

  it('rejects work after termination', async () => {
    const pool = new WorkerPool(poolWorker, { size: 1 })
    pool.terminate()

    await expect(pool.run({ id: 1, waitMs: 1 })).rejects.toBeInstanceOf(WorkerDisposedError)
  })

  it('honours an abort signal for queued tasks', async () => {
    const pool = new WorkerPool(poolWorker, { size: 1 })
    const controller = new AbortController()
    const first = pool.run({ id: 1, waitMs: 50 })
    const second = pool.run({ id: 2, waitMs: 1 }, { signal: controller.signal })

    controller.abort()

    await expect(second).rejects.toBeInstanceOf(CancelledError)

    pool.terminate()
    await expect(first).rejects.toBeInstanceOf(WorkerDisposedError)
  })
})
