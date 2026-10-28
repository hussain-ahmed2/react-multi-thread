/**
 * React binding for a single worker.
 *
 * The worker is created lazily on the first task, eagerly with `config.eager`,
 * or by the initial `config.autoRun` task. State updates are guarded by a
 * monotonically increasing run id so a late result from a cancelled run can
 * never overwrite a newer one.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { isWorkerSupported } from '../../shared/environment'
import { CancelledError, toError } from '../../shared/errors'
import { systemClock } from '../../shared/types'
import type {
  AnyWorkerDefinition,
  CancelTaskOptions,
  TaskOptions,
  UseWorkerConfig,
  WorkerController,
  WorkerInput,
  WorkerMethodArgs,
  WorkerMethodKeys,
  WorkerMethodResult,
  WorkerOutput,
  WorkerState,
} from './types'
import { WorkerHandle } from './worker-handle'

function createInitialState<Output>(): WorkerState<Output> {
  return {
    status: 'idle',
    result: null,
    error: null,
    progress: null,
    durationMs: null,
    attempts: 0,
  }
}

/**
 * Run a worker from a React component.
 *
 * @example
 * const double = createWorker((n: number) => n * 2)
 *
 * function Counter() {
 *   const worker = useWorker(double)
 *   return <button onClick={() => void worker.run(21)}>{worker.result ?? 'Run'}</button>
 * }
 */
export function useWorker<Definition extends AnyWorkerDefinition>(
  definition: Definition,
  config: UseWorkerConfig<Definition> = {},
): WorkerController<Definition> {
  const handleRef = useRef<WorkerHandle<Definition> | null>(null)
  const configRef = useRef(config)
  const mountedRef = useRef(true)
  const runIdRef = useRef(0)

  const [state, setState] = useState<WorkerState<WorkerOutput<Definition>>>(() =>
    createInitialState<WorkerOutput<Definition>>(),
  )

  // Always read the latest callbacks/config without forcing handle recreation.
  useEffect(() => {
    configRef.current = config
  })

  useEffect(() => {
    mountedRef.current = true

    return (): void => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    return (): void => {
      runIdRef.current += 1
      handleRef.current?.dispose()
      handleRef.current = null
    }
  }, [definition])

  const ensureHandle = useCallback((): WorkerHandle<Definition> => {
    if (handleRef.current === null) {
      handleRef.current = new WorkerHandle<Definition>(definition, configRef.current)
    }

    return handleRef.current
  }, [definition])

  const execute = useCallback(
    async (
      method: string | null,
      args: readonly unknown[],
      options: TaskOptions,
    ): Promise<unknown> => {
      runIdRef.current += 1
      const runId = runIdRef.current
      const startedAt = systemClock.now()
      const handle = ensureHandle()
      const baseConfig = configRef.current

      let attempts = 1

      setState({
        status: 'running',
        result: null,
        error: null,
        progress: null,
        durationMs: null,
        attempts,
      })

      const mergedOptions: TaskOptions = {
        ...options,
        onProgress: (value: unknown): void => {
          if (mountedRef.current && runIdRef.current === runId) {
            setState((current) => ({ ...current, progress: value }))
          }

          baseConfig.onProgress?.(value)
          options.onProgress?.(value)
        },
        onMessage: (message: unknown): void => {
          baseConfig.onMessage?.(message)
          options.onMessage?.(message)
        },
        onRetry: (meta): void => {
          attempts = meta.attempt + 1

          if (mountedRef.current && runIdRef.current === runId) {
            setState((current) => ({ ...current, attempts }))
          }

          baseConfig.onRetry?.(meta)
          options.onRetry?.(meta)
        },
      }

      try {
        const result = await handle.invoke(method, args, mergedOptions)

        if (mountedRef.current && runIdRef.current === runId) {
          setState({
            status: 'success',
            result: result as WorkerOutput<Definition>,
            error: null,
            progress: 1,
            durationMs: systemClock.now() - startedAt,
            attempts,
          })
        }

        baseConfig.onSuccess?.(result as WorkerOutput<Definition>)

        return result
      } catch (error: unknown) {
        const normalized = toError(error)

        if (mountedRef.current && runIdRef.current === runId) {
          setState({
            status: normalized instanceof CancelledError ? 'cancelled' : 'error',
            result: null,
            error: normalized,
            progress: null,
            durationMs: systemClock.now() - startedAt,
            attempts,
          })
        }

        if (!(normalized instanceof CancelledError)) {
          baseConfig.onError?.(normalized)
        }

        throw normalized
      }
    },
    [ensureHandle],
  )

  const run = useCallback(
    (input: WorkerInput<Definition>, options: TaskOptions = {}): Promise<WorkerOutput<Definition>> =>
      execute(null, [input], options) as Promise<WorkerOutput<Definition>>,
    [execute],
  )

  const call = useCallback(
    <Key extends WorkerMethodKeys<Definition>>(
      method: Key,
      args: WorkerMethodArgs<Definition, Key>,
      options: TaskOptions = {},
    ): Promise<WorkerMethodResult<Definition, Key>> =>
      execute(method, [...args], options) as Promise<WorkerMethodResult<Definition, Key>>,
    [execute],
  )

  useEffect(() => {
    const autoRun = configRef.current.autoRun

    if (autoRun === undefined) return

    let active = true
    const timer = setTimeout(() => {
      if (!active) return

      const task =
        'input' in autoRun
          ? execute(null, [autoRun.input], autoRun.options ?? {})
          : execute(autoRun.method, [...autoRun.args], autoRun.options ?? {})

      void task.catch(() => undefined)
    }, 0)

    return (): void => {
      active = false
      clearTimeout(timer)
    }
  }, [execute])

  const cancel = useCallback((options: CancelTaskOptions = {}): void => {
    runIdRef.current += 1
    handleRef.current?.cancel(options)

    if (mountedRef.current) {
      setState((current) => ({
        ...current,
        status: 'cancelled',
        error: new CancelledError('Task cancelled by caller'),
        progress: null,
      }))
    }
  }, [])

  const reset = useCallback((): void => {
    runIdRef.current += 1

    if (mountedRef.current) {
      setState(createInitialState<WorkerOutput<Definition>>())
    }
  }, [])

  const restart = useCallback((): void => {
    runIdRef.current += 1
    handleRef.current?.dispose()
    handleRef.current = null

    if (mountedRef.current) {
      setState(createInitialState<WorkerOutput<Definition>>())
    }
  }, [])

  useEffect(() => {
    if (configRef.current.eager !== true) return

    let active = true
    const handle = ensureHandle()

    handle.warmup().catch((error: unknown) => {
      if (!active || !mountedRef.current) return

      setState({
        ...createInitialState<WorkerOutput<Definition>>(),
        status: 'error',
        error: toError(error),
      })
    })

    return (): void => {
      active = false
    }
  }, [ensureHandle])

  return {
    ...state,
    supported: isWorkerSupported(),
    run,
    call,
    cancel,
    reset,
    restart,
  }
}
