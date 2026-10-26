/**
 * react-threaded
 *
 * Typed Web Workers for React: hooks, cancellable tasks, pools, shared atomics,
 * plugins, and Comlink-style proxies.
 *
 * @packageDocumentation
 */

export {
  CancelledError,
  isSerializedWorkerError,
  toError,
  WorkerDisposedError,
  WorkerTaskError,
  WorkerTimeoutError,
  WorkerUnsupportedError,
  WorkerUsageError,
} from './shared/errors'
export type { SerializedWorkerError } from './shared/errors'

export {
  getDefaultPoolSize,
  getHardwareConcurrency,
  isBroadcastChannelSupported,
  isSharedMemoryAvailable,
  isWorkerSupported,
} from './shared/environment'

export { collectTransferables } from './shared/transferables'

export {
  createWorker,
  createWorkerProxy,
  useWorker,
  useWorkerProxy,
  WorkerHandle,
} from './features/worker'
export type {
  AnyWorkerDefinition,
  AnyWorkerFunction,
  AsyncWorkerMethod,
  AsyncWorkerMethods,
  CancelTaskOptions,
  HandlerOf,
  MethodsOf,
  TaskOptions,
  UseWorkerConfig,
  WorkerConfig,
  WorkerContext,
  WorkerController,
  WorkerDefinition,
  WorkerFunction,
  WorkerHandler,
  WorkerInput,
  WorkerKind,
  WorkerMethod,
  WorkerMethodArgs,
  WorkerMethodKeys,
  WorkerMethodResult,
  WorkerMethods,
  WorkerOutput,
  WorkerProxy,
  WorkerRetryConfig,
  WorkerState,
  WorkerStatus,
} from './features/worker'

export { useWorkerPool, WorkerPool } from './features/pool'
export type {
  PoolListener,
  PoolStats,
  UseWorkerPoolConfig,
  WorkerPoolConfig,
  WorkerPoolController,
} from './features/pool'

export { createSharedAtom, useSharedAtom } from './features/shared-state'
export type {
  SharedAtom,
  SharedAtomBinding,
  SharedAtomListener,
  SharedAtomOptions,
  SharedAtomSetter,
  SharedAtomUpdater,
  UseSharedAtomConfig,
} from './features/shared-state'

export { loggerPlugin, timingPlugin } from './features/plugins'
export type {
  LogEntry,
  LoggerEvent,
  LoggerPluginConfig,
  RetryMeta,
  TaskErrorMeta,
  TaskMeta,
  TaskSettledMeta,
  TimingEntry,
  TimingPluginConfig,
  WorkerCreatedMeta,
  WorkerPlugin,
  WorkerTerminatedMeta,
} from './features/plugins'
