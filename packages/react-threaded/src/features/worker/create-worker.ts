/**
 * Public factory for worker definitions.
 *
 * `createWorker()` is intentionally cheap: it only normalises source and
 * validates configuration. No Worker, Blob, or URL is created until the first
 * task (or an eager React hook) asks for one.
 */

import { normalizeAttempts } from '../../shared/timing'
import { toFunctionSource, toMethodsSource } from './normalize-source'
import type {
  AnyWorkerDefinition,
  AnyWorkerFunction,
  WorkerConfig,
  WorkerDefinition,
  WorkerHandler,
  WorkerMethods,
} from './types'

let definitionCounter = 0

/** Create a definition backed by one self-contained function. */
export function createWorker<Handler extends AnyWorkerFunction>(
  handler: Handler,
  config?: WorkerConfig,
): WorkerDefinition<Handler>

/** Create a definition backed by a record of named methods. */
export function createWorker<Methods extends WorkerMethods>(
  methods: Methods,
  config?: WorkerConfig,
): WorkerDefinition<Methods>

export function createWorker(
  handler: WorkerHandler,
  config: WorkerConfig = {},
): AnyWorkerDefinition {
  const kind = typeof handler === 'function' ? 'function' : 'methods'

  const source =
    kind === 'function'
      ? toFunctionSource(handler as AnyWorkerFunction)
      : toMethodsSource(handler as WorkerMethods)

  const normalizedConfig: WorkerConfig = {
    ...(config.name !== undefined ? { name: config.name } : {}),
    ...(config.retry !== undefined
      ? {
          retry: {
            attempts: normalizeAttempts(config.retry.attempts),
            ...(config.retry.delayMs !== undefined
              ? { delayMs: Math.max(0, config.retry.delayMs) }
              : {}),
          },
        }
      : {}),
    ...(config.plugins !== undefined ? { plugins: [...config.plugins] } : {}),
    ...(config.onPluginError !== undefined ? { onPluginError: config.onPluginError } : {}),
  }

  definitionCounter += 1

  // The brand property is type-only. The cast is the single place where a
  // definition is constructed, which keeps the public type honest.
  const definition = {
    kind,
    name: normalizedConfig.name ?? `react-threaded-worker-${definitionCounter}`,
    source,
    config: normalizedConfig,
  } as unknown as AnyWorkerDefinition

  return definition
}
