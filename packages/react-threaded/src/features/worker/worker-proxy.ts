/**
 * Comlink-style proxies.
 *
 * A proxy wraps a methods-style worker so callers can write `await api.hash(x)`
 * instead of `handle.call('hash', [x])`. Each call is a normal task with the
 * same cancellation, retry, and plugin behaviour.
 */

import type { WorkerConfig, WorkerDefinition, WorkerMethods, WorkerProxy } from './types'
import { WorkerHandle } from './worker-handle'

/** Internal factory used by both the imperative and React entry points. */
export function buildWorkerProxy<Methods extends WorkerMethods>(
  getHandle: () => WorkerHandle<WorkerDefinition<Methods>>,
): WorkerProxy<Methods> {
  const target = {} as WorkerProxy<Methods>

  return new Proxy<WorkerProxy<Methods>>(target, {
    get(_target, property, receiver) {
      if (property === '$dispose') {
        return (): void => {
          getHandle().dispose()
        }
      }

      // Returning undefined for `then` prevents `await proxy` from trying to
      // assimilate the proxy itself as a promise.
      if (property === 'then') return undefined

      if (typeof property !== 'string') {
        return Reflect.get(_target, property, receiver)
      }

      return (...args: unknown[]): Promise<unknown> => getHandle().invoke(property, args)
    },
  })
}

/**
 * Create a standalone proxy. It owns one worker and must be disposed with
 * `$dispose()` when it is no longer needed.
 */
export function createWorkerProxy<Methods extends WorkerMethods>(
  definition: WorkerDefinition<Methods>,
  config: WorkerConfig = {},
): WorkerProxy<Methods> {
  const handle = new WorkerHandle(definition, config)

  return buildWorkerProxy(() => handle)
}
