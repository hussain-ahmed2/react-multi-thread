/**
 * Public worker types.
 *
 * The design keeps three layers separate:
 * 1. `WorkerConfig` describes how a worker is created.
 * 2. `WorkerDefinition` is a serialisable description of the worker function.
 * 3. `WorkerController` is the React-facing state machine.
 *
 * Only `createWorker()` should construct a `WorkerDefinition`; the branded
 * property below prevents accidental hand-built definitions.
 */

import type { RetryMeta, WorkerPlugin } from '../plugins/types'

/** Unique brand used to carry the handler type through the public API. */
declare const workerHandlerBrand: unique symbol

/** The execution context passed as the final argument to every worker task. */
export type WorkerContext = {
  /** Report progress from 0 to 1 (or any JSON-serialisable value). */
  readonly progress: (value: unknown) => void
  /**
   * True after `cancel()` is called. Synchronous loops are cancelled quickly
   * when SharedArrayBuffer is available; otherwise call `yield()` regularly to
   * let cancellation messages through.
   */
  readonly cancelled: boolean
  /** Yield to the worker event loop so queued messages can be processed. */
  readonly yield: () => Promise<void>
  /** Send a side-channel event to the main thread. */
  readonly post: (message: unknown, transfer?: Transferable[]) => void
}

/** Any single-function worker handler. Inputs are typed per definition. */
export type AnyWorkerFunction = (input: any, context: WorkerContext) => unknown

/** Ergonomic alias for consumers declaring standalone worker functions. */
export type WorkerFunction<Input = unknown, Output = unknown> = (
  input: Input,
  context: WorkerContext,
) => Output | Promise<Output>

/** Any method in a methods-style worker. */
export type WorkerMethod = (...args: any[]) => unknown

/** A record of named methods, used by proxy-style workers. */
export type WorkerMethods = Record<string, WorkerMethod>

/** Every handler shape accepted by `createWorker()`. */
export type WorkerHandler = AnyWorkerFunction | WorkerMethods

/** How a definition invokes its handler. */
export type WorkerKind = 'function' | 'methods'

/** Retry policy for transient failures. */
export type WorkerRetryConfig = {
  readonly attempts: number
  readonly delayMs?: number
}

/** Worker creation options shared by definitions, handles, and pools. */
export type WorkerConfig = {
  readonly name?: string
  readonly plugins?: readonly WorkerPlugin[]
  readonly retry?: WorkerRetryConfig
  /**
   * Called when an observational plugin throws. Plugin failures never break a
   * task; without this callback they are swallowed so production work is safe.
   */
  readonly onPluginError?: (error: Error, plugin: WorkerPlugin) => void
}

/** Per-task options. */
export type TaskOptions = {
  /** Transfer ownership of input buffers. Use `'auto'` to discover them. */
  readonly transfer?: readonly Transferable[] | 'auto'
  /** Cancel the task when aborted. */
  readonly signal?: AbortSignal
  /** Hard timeout in milliseconds. The worker is terminated on timeout. */
  readonly timeoutMs?: number
  /** Progress callback for this task. */
  readonly onProgress?: (value: unknown) => void
  /** Side-channel message callback for this task. */
  readonly onMessage?: (message: unknown) => void
  /** Fired before a retry attempt. */
  readonly onRetry?: (meta: RetryMeta) => void
}

/** Cancellation strategy. */
export type CancelTaskOptions = {
  /**
   * `terminate` (default) stops a synchronous worker immediately and respawns
   * it on the next task. `cooperative` asks the task to stop and is only useful
   * for functions that poll `ctx.cancelled` or call `ctx.yield()`.
   */
  readonly mode?: 'terminate' | 'cooperative'
}

/** A serialisable description of a worker. Create these with `createWorker()`. */
export type WorkerDefinition<Handler extends WorkerHandler = WorkerHandler> = {
  readonly kind: WorkerKind
  readonly name: string
  readonly source: string
  readonly config: WorkerConfig
  readonly [workerHandlerBrand]: Handler
}

/** A definition with its handler type erased. */
export type AnyWorkerDefinition = WorkerDefinition<WorkerHandler>

/** Extract the handler type from a definition. */
export type HandlerOf<Definition extends AnyWorkerDefinition> =
  Definition extends WorkerDefinition<infer Handler> ? Handler : never

/** Input accepted by `run()` for a single-function worker. */
export type WorkerInput<Definition extends AnyWorkerDefinition> =
  HandlerOf<Definition> extends (input: infer Input, ...rest: never[]) => unknown ? Input : never

/** Resolved output of a single-function worker. */
export type WorkerOutput<Definition extends AnyWorkerDefinition> =
  HandlerOf<Definition> extends (...args: never[]) => infer Result ? Awaited<Result> : never

/** Methods map for a methods-style worker (empty for single functions). */
export type MethodsOf<Definition extends AnyWorkerDefinition> =
  HandlerOf<Definition> extends (...args: never[]) => unknown
    ? Record<never, never>
    : HandlerOf<Definition>

/** String keys of a methods-style worker. */
export type WorkerMethodKeys<Definition extends AnyWorkerDefinition> = Extract<
  keyof MethodsOf<Definition>,
  string
>

/** Remove the final `WorkerContext` parameter from method arguments. */
export type WithoutContext<Args extends readonly unknown[]> =
  Args extends readonly [...infer Rest, WorkerContext] ? Rest : Args

/** Arguments of a methods-style worker call. */
export type WorkerMethodArgs<
  Definition extends AnyWorkerDefinition,
  Key extends keyof MethodsOf<Definition>,
> = MethodsOf<Definition>[Key] extends (...args: infer Args) => unknown
  ? WithoutContext<Args>
  : never

/** Resolved result of a methods-style worker call. */
export type WorkerMethodResult<
  Definition extends AnyWorkerDefinition,
  Key extends keyof MethodsOf<Definition>,
> = MethodsOf<Definition>[Key] extends (...args: never[]) => infer Result ? Awaited<Result> : never

/** Promise-returning façade generated for every method. */
export type AsyncWorkerMethod<Method extends WorkerMethod> =
  Method extends (...args: infer Args) => infer Result
    ? (...args: WithoutContext<Args>) => Promise<Awaited<Result>>
    : never

/** All methods, converted to promises. */
export type AsyncWorkerMethods<Methods extends WorkerMethods> = {
  readonly [Key in keyof Methods]: AsyncWorkerMethod<Methods[Key]>
}

/** Comlink-style proxy returned by `createWorkerProxy()` / `useWorkerProxy()`. */
export type WorkerProxy<Methods extends WorkerMethods> = AsyncWorkerMethods<Methods> & {
  readonly $dispose: () => void
}

/** Visual state of a controller. */
export type WorkerStatus = 'idle' | 'running' | 'success' | 'error' | 'cancelled'

/** Observable state of a worker controller. */
export type WorkerState<Output> = {
  readonly status: WorkerStatus
  readonly result: Output | null
  readonly error: Error | null
  readonly progress: unknown
  readonly durationMs: number | null
  readonly attempts: number
}

/** Options accepted by `useWorker()`. */
export type UseWorkerConfig<Output> = WorkerConfig & {
  /** Spawn the worker as soon as the component mounts. */
  readonly eager?: boolean
  readonly onSuccess?: (result: Output) => void
  readonly onError?: (error: Error) => void
  readonly onProgress?: (value: unknown) => void
  readonly onMessage?: (message: unknown) => void
  readonly onRetry?: (meta: RetryMeta) => void
}

/** Controller returned by `useWorker()`. */
export type WorkerController<Definition extends AnyWorkerDefinition> = WorkerState<
  WorkerOutput<Definition>
> & {
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
  readonly cancel: (options?: CancelTaskOptions) => void
  readonly reset: () => void
  readonly restart: () => void
}
