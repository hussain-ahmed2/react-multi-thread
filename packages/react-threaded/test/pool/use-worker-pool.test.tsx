// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useWorkerPool } from '../../src/features/pool/use-worker-pool'
import { createWorker } from '../../src/features/worker/create-worker'
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

describe('useWorkerPool', () => {
  it('runs tasks and publishes stats', async () => {
    const { result } = renderHook(() => useWorkerPool(poolWorker, { size: 2 }))

    await act(async () => {
      const results = await Promise.all([
        result.current.run({ id: 1, waitMs: 10 }),
        result.current.run({ id: 2, waitMs: 10 }),
        result.current.run({ id: 3, waitMs: 10 }),
        result.current.run({ id: 4, waitMs: 10 }),
      ])

      expect(results).toEqual([2, 4, 6, 8])
    })

    await waitFor(() => expect(result.current.stats.completed).toBe(4))

    expect(result.current.stats.size).toBe(2)
    expect(result.current.stats.created).toBeLessThanOrEqual(2)
    expect(result.current.stats.failed).toBe(0)
    expect(result.current.supported).toBe(true)
  })

  it('terminates and rejects subsequent work', async () => {
    const { result } = renderHook(() => useWorkerPool(poolWorker, { size: 1 }))

    act(() => {
      result.current.terminate()
    })

    await expect(result.current.run({ id: 1, waitMs: 1 })).rejects.toThrow(/terminated/)
  })
})
