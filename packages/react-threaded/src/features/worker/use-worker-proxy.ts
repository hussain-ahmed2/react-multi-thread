/**
 * React binding for a methods-style worker proxy.
 *
 * The proxy itself is stable for the lifetime of a definition. The underlying
 * worker is lazy and is disposed when the component unmounts.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { WorkerConfig, WorkerDefinition, WorkerMethods, WorkerProxy } from './types'
import { WorkerHandle } from './worker-handle'
import { buildWorkerProxy } from './worker-proxy'

/** Create a Comlink-style proxy owned by the current component. */
export function useWorkerProxy<Methods extends WorkerMethods>(
  definition: WorkerDefinition<Methods>,
  config: WorkerConfig = {},
): WorkerProxy<Methods> {
  const handleRef = useRef<WorkerHandle<WorkerDefinition<Methods>> | null>(null)
  const configRef = useRef(config)

  useEffect(() => {
    configRef.current = config
  })

  const getHandle = useCallback((): WorkerHandle<WorkerDefinition<Methods>> => {
    if (handleRef.current === null) {
      handleRef.current = new WorkerHandle(definition, configRef.current)
    }

    return handleRef.current
  }, [definition])

  const proxy = useMemo(() => buildWorkerProxy(getHandle), [getHandle])

  useEffect(() => {
    return (): void => {
      handleRef.current?.dispose()
      handleRef.current = null
    }
  }, [definition])

  return proxy
}
