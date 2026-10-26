import { describe, expect, it } from 'vitest'
import { loggerPlugin, timingPlugin } from '../../src/features/plugins'
import type { LogEntry, TimingEntry } from '../../src/features/plugins/types'
import { createWorker } from '../../src/features/worker'
import { WorkerHandle } from '../../src/features/worker/worker-handle'
import { registerDefinition } from '../helpers/fake-worker'

describe('plugins', () => {
  it('logs lifecycle events and timings', async () => {
    const logs: LogEntry[] = []
    const timings: TimingEntry[] = []

    const definition = createWorker((value: number) => value + 1, {
      plugins: [
        loggerPlugin({ onLog: (entry) => logs.push(entry) }),
        timingPlugin({ onTiming: (entry) => timings.push(entry) }),
      ],
    })
    registerDefinition(definition)

    const handle = new WorkerHandle(definition)

    try {
      await expect(handle.run(1)).resolves.toBe(2)
    } finally {
      handle.dispose()
    }

    expect(logs.map((entry) => entry.event)).toEqual([
      'worker-created',
      'task-start',
      'task-success',
      'worker-terminated',
    ])

    const timing = timings[0]

    expect(timing).toBeDefined()

    if (timing !== undefined) {
      expect(timing.durationMs).toBeGreaterThanOrEqual(0)
      expect(timing.method).toBeNull()
    }
  })

  it('isolates plugin failures from task execution', async () => {
    const pluginErrors: Error[] = []

    const definition = createWorker((value: number) => value * 2, {
      plugins: [
        {
          name: 'broken',
          onTaskStart: (): void => {
            throw new Error('plugin boom')
          },
        },
      ],
      onPluginError: (error) => pluginErrors.push(error),
    })
    registerDefinition(definition)

    const handle = new WorkerHandle(definition)

    try {
      await expect(handle.run(21)).resolves.toBe(42)
    } finally {
      handle.dispose()
    }

    expect(pluginErrors[0]?.message).toBe('plugin boom')
  })
})
