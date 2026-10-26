/**
 * Worker pool types.
 */

import type {
  AnyWorkerDefinition,
  TaskOptions,
  WorkerConfig,
  WorkerInput,
  WorkerMethodArgs,
  WorkerMethodKeys,
  WorkerMethodResult,
  WorkerOutput,
} from '../worker/types'

/** Live counters for a pool. */
export type PoolStats = {
  readonly size: number
  readonly active: number
  readonly queued: number
  readonly created: number
  readonly completed: number
  readonly failed: number
  readonly cancelled: number
}

/** Listener invoked whenever pool stats change. */
export type PoolListener = (stats: PoolStats) => void

/** Configuration for a worker pool. */
export type WorkerPoolConfig = WorkerConfig & {
  /** Maximum concurrent workers. Defaults to `hardwareConcurrency - 1`. */
  readonly size?: number
}

/** Configuration for `useWorkerPool()`. */
export type UseWorkerPoolConfig = WorkerPoolConfig

/** Controller returned by `useWorkerPool()`. */
export type WorkerPoolController<Definition extends AnyWorkerDefinition> = {
  readonly stats: PoolStats
  readonly supported: boolean
  readonly run: (
    input: WorkerInput<Definition>,
    options?: TaskOptions,
  ) => Promise<WorkerOutput<Definition>>
  readonly call: <Key extends WorkerMethodKeys<Definition>>(
    method: Key,
    args: WorkerMethodArgs<Definition, Key>,
    options?: TaskOptions,
  ) => Promise<WorkerMethodResult<Definition, Key>>
  readonly map: (
    inputs: readonly WorkerInput<Definition>[],
    options?: TaskOptions,
  ) => Promise<WorkerOutput<Definition>[]>
  readonly terminate: () => void
}
