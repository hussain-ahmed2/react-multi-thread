import { describe, expect, it } from 'vitest'
import { createWorker, createWorkerProxy } from '../../src/features/worker'
import type { RetryMeta } from '../../src/features/plugins/types'
import {
  CancelledError,
  WorkerDisposedError,
  WorkerTaskError,
  WorkerTimeoutError,
} from '../../src/shared/errors'
import { registerDefinition } from '../helpers/fake-worker'
import { WorkerHandle } from '../../src/features/worker/worker-handle'

const progressWorker = createWorker(
  async (input: { readonly value: number }, context) => {
    context.progress(0.5)
    context.post({ phase: 'halfway' })
    await context.yield()
    return input.value * 2
  },
)
registerDefinition(progressWorker)

const methodsWorker = createWorker({
  add(a: number, b: number): number {
    return a + b
  },
  async fail(): Promise<never> {
    throw new Error('method failed')
  },
})
registerDefinition(methodsWorker)

const cancellableWorker = createWorker(async (input: number, context) => {
  for (let index = 0; index < 10_000; index += 1) {
    if (context.cancelled) return -1
    await context.yield()
  }

  return input
})
registerDefinition(cancellableWorker)

const slowWorker = createWorker(async (input: number) => {
  await new Promise((resolve) => setTimeout(resolve, 60))
  return input
})
registerDefinition(slowWorker)

const retryWorker = createWorker(
  (_input: number) => {
    const scope = self as unknown as { attempts?: number }
    scope.attempts = (scope.attempts ?? 0) + 1

    if (scope.attempts < 3) {
      throw new Error(`attempt ${scope.attempts}`)
    }

    return scope.attempts
  },
  { retry: { attempts: 3, delayMs: 1 } },
)
registerDefinition(retryWorker)

const throwingWorker = createWorker((_input: null) => {
  throw new Error('boom')
})
registerDefinition(throwingWorker)

describe('WorkerHandle', () => {
  it('runs a function worker and reports progress/messages', async () => {
    const progress: unknown[] = []
    const events: unknown[] = []
    const handle = new WorkerHandle(progressWorker)

    try {
      const result = await handle.run(
        { value: 21 },
        {
          onProgress: (value) => progress.push(value),
          onMessage: (message) => events.push(message),
        },
      )

      expect(result).toBe(42)
      expect(progress).toEqual([0.5])
      expect(events).toEqual([{ phase: 'halfway' }])
    } finally {
      handle.dispose()
    }
  })

  it('supports methods-style workers and proxies', async () => {
    const handle = new WorkerHandle(methodsWorker)

    try {
      await expect(handle.call('add', [2, 3])).resolves.toBe(5)
      await expect(handle.call('fail', [])).rejects.toBeInstanceOf(WorkerTaskError)
    } finally {
      handle.dispose()
    }

    const proxy = createWorkerProxy(methodsWorker)

    try {
      await expect(proxy.add(20, 22)).resolves.toBe(42)
    } finally {
      proxy.$dispose()
    }
  })

  it('rejects run() on a methods worker and call() on a function worker', async () => {
    const methodsHandle = new WorkerHandle(methodsWorker)
    const functionHandle = new WorkerHandle(progressWorker)

    try {
      await expect(
        methodsHandle.run(undefined as never),
      ).rejects.toThrow(/single-function worker/)
      await expect(
        functionHandle.call('add' as never, [1, 2] as never),
      ).rejects.toThrow(/methods-style worker/)
    } finally {
      methodsHandle.dispose()
      functionHandle.dispose()
    }
  })

  it('hard-cancels an in-flight task', async () => {
    const handle = new WorkerHandle(cancellableWorker)
    const task = handle.run(7)

    await new Promise((resolve) => setTimeout(resolve, 15))
    handle.cancel()

    try {
      await expect(task).rejects.toBeInstanceOf(CancelledError)
    } finally {
      handle.dispose()
    }
  })

  it('times out and terminates a slow task', async () => {
    const handle = new WorkerHandle(slowWorker)

    try {
      await expect(handle.run(1, { timeoutMs: 5 })).rejects.toBeInstanceOf(WorkerTimeoutError)
    } finally {
      handle.dispose()
    }
  })

  it('retries transient failures and reports retry metadata', async () => {
    const retries: RetryMeta[] = []
    const handle = new WorkerHandle(retryWorker)

    try {
      const result = await handle.run(0, { onRetry: (meta) => retries.push(meta) })

      expect(result).toBe(3)
      expect(retries.map((meta) => meta.attempt)).toEqual([1, 2])
    } finally {
      handle.dispose()
    }
  })

  it('surfaces remote errors as WorkerTaskError', async () => {
    const handle = new WorkerHandle(throwingWorker)

    try {
      await expect(handle.run(null)).rejects.toMatchObject({
        name: 'Error',
        message: 'boom',
      })
    } finally {
      handle.dispose()
    }
  })

  it('rejects work after dispose and rejects pending work immediately', async () => {
    const handle = new WorkerHandle(cancellableWorker)
    const pending = handle.run(1)

    handle.dispose()

    await expect(pending).rejects.toBeInstanceOf(WorkerDisposedError)
    await expect(handle.warmup()).rejects.toBeInstanceOf(WorkerDisposedError)
  })
})
