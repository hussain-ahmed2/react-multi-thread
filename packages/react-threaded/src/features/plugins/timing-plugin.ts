/**
 * Timing plugin.
 *
 * Reports a compact, structured record for every successful task. This is the
 * shape most dashboard integrations need: worker name, method, attempt, and
 * duration.
 */

import type { TimingPluginConfig, WorkerPlugin } from './types'

/** Create a plugin that emits timing records for successful tasks. */
export function timingPlugin(config: TimingPluginConfig): WorkerPlugin {
  return {
    name: 'timing',
    onTaskSettled: (meta): void => {
      config.onTiming({
        name: meta.name,
        method: meta.method,
        attempt: meta.attempt,
        durationMs: meta.durationMs,
      })
    },
  }
}
