/**
 * React binding for a worker pool.
 *
 * The pool is created in an effect so React StrictMode's setup/cleanup cycle
 * cannot leave a terminated pool mounted. Configuration is captured on mount;
 * pass a new `definition` or `size` to rebuild the pool.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { getDefaultPoolSize, isWorkerSupported } from '../../shared/environment'
import { WorkerDisposedError } from '../../shared/errors'
import type {
  AnyWorkerDefinition,
  TaskOptions,
  WorkerInput,
  WorkerMethodArgs,
  WorkerMethodKeys,
  WorkerMethodResult,
  WorkerOutput,
} from '../worker/types'
import type { PoolStats, UseWorkerPoolConfig, WorkerPoolController } from './types'
import { WorkerPool } from './worker-pool'

function createInitialStats(size: number): PoolStats {
  return {
    size,
    active: 0,
    queued: 0,
    created: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  }
}

/** Create a pool of workers owned by the current component. */
export function useWorkerPool<Definition extends AnyWorkerDefinition>(
  definition: Definition,
  config: UseWorkerPoolConfig = {},
): WorkerPoolController<Definition> {
  const size = Math.max(1, Math.floor(config.size ?? getDefaultPoolSize()))

  const poolRef = useRef<WorkerPool<Definition> | null>(null)
  const configRef = useRef(config)
  const [stats, setStats] = useState<PoolStats>(() => createInitialStats(size))

  useEffect(() => {
    configRef.current = config
  })

  useEffect(() => {
    const pool = new WorkerPool<Definition>(definition, { ...configRef.current, size })

    poolRef.current = pool
    setStats(pool.getStats())

    const unsubscribe = pool.subscribe(setStats)

    return (): void => {
      unsubscribe()
      pool.terminate()

      if (poolRef.current === pool) {
        poolRef.current = null
      }
    }
  }, [definition, size])

  const run = useCallback(
    (
      input: WorkerInput<Definition>,
      options: TaskOptions = {},
    ): Promise<WorkerOutput<Definition>> => {
      const pool = poolRef.current

      if (pool === null) {
        return Promise.reject(new WorkerDisposedError('Worker pool is not ready yet'))
      }

      return pool.run(input, options)
    },
    [],
  )

  const call = useCallback(
    <Key extends WorkerMethodKeys<Definition>>(
      method: Key,
      args: WorkerMethodArgs<Definition, Key>,
      options: TaskOptions = {},
    ): Promise<WorkerMethodResult<Definition, Key>> => {
      const pool = poolRef.current

      if (pool === null) {
        return Promise.reject(new WorkerDisposedError('Worker pool is not ready yet'))
      }

      return pool.call(method, args, options)
    },
    [],
  )

  const map = useCallback(
    (
      inputs: readonly WorkerInput<Definition>[],
      options: TaskOptions = {},
    ): Promise<WorkerOutput<Definition>[]> => {
      const pool = poolRef.current

      if (pool === null) {
        return Promise.reject(new WorkerDisposedError('Worker pool is not ready yet'))
      }

      return pool.map(inputs, options)
    },
    [],
  )

  const terminate = useCallback((): void => {
    poolRef.current?.terminate()
  }, [])

  return {
    stats,
    supported: isWorkerSupported(),
    run,
    call,
    map,
    terminate,
  }
}
