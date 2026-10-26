// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createWorker } from '../../src/features/worker/create-worker'
import { useWorker } from '../../src/features/worker/use-worker'
import { useWorkerProxy } from '../../src/features/worker/use-worker-proxy'
import { CancelledError } from '../../src/shared/errors'
import { registerDefinition } from '../helpers/fake-worker'

const doubleWorker = createWorker((value: number) => value * 2)
registerDefinition(doubleWorker)

const progressWorker = createWorker(async (value: number, context) => {
  context.progress(0.5)
  await context.yield()
  return value
})
registerDefinition(progressWorker)

const cancellableWorker = createWorker(async (value: number, context) => {
  for (let index = 0; index < 10_000; index += 1) {
    if (context.cancelled) return -1
    await context.yield()
  }

  return value
})
registerDefinition(cancellableWorker)

const methodsWorker = createWorker({
  add(a: number, b: number): number {
    return a + b
  },
})
registerDefinition(methodsWorker)

describe('useWorker', () => {
  it('runs a task and exposes the result', async () => {
    const { result } = renderHook(() => useWorker(doubleWorker))

    expect(result.current.status).toBe('idle')
    expect(result.current.supported).toBe(true)

    await act(async () => {
      await result.current.run(21)
    })

    expect(result.current.status).toBe('success')
    expect(result.current.result).toBe(42)
    expect(result.current.error).toBeNull()
  })

  it('tracks progress and forwards callbacks', async () => {
    const seen: unknown[] = []
    const { result } = renderHook(() =>
      useWorker(progressWorker, { onProgress: (value) => seen.push(value) }),
    )

    await act(async () => {
      await result.current.run(5)
    })

    expect(seen).toEqual([0.5])
    expect(result.current.progress).toBe(1)
  })

  it('cancels a running task', async () => {
    const { result } = renderHook(() => useWorker(cancellableWorker))
    let task: Promise<unknown> | undefined

    act(() => {
      task = result.current.run(5).catch((error: unknown) => error)
    })

    await waitFor(() => expect(result.current.status).toBe('running'))

    act(() => {
      result.current.cancel()
    })

    await waitFor(() => expect(result.current.status).toBe('cancelled'))

    if (task === undefined) throw new Error('Task did not start')

    await expect(task).resolves.toBeInstanceOf(CancelledError)
  })

  it('restarts the worker and resets state', async () => {
    const { result } = renderHook(() => useWorker(doubleWorker))

    await act(async () => {
      await result.current.run(2)
    })

    expect(result.current.result).toBe(4)

    act(() => {
      result.current.restart()
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.result).toBeNull()
  })
})

describe('useWorkerProxy', () => {
  it('exposes promise-returning methods', async () => {
    const { result } = renderHook(() => useWorkerProxy(methodsWorker))

    await expect(result.current.add(20, 22)).resolves.toBe(42)
  })
})
