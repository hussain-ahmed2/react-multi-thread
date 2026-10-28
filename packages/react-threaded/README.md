# react-threaded

Typed Web Workers for React: hooks, cancellable tasks, worker pools, shared atomics, plugins, and Comlink-style proxies.

[![npm version](https://img.shields.io/npm/v/react-threaded.svg)](https://www.npmjs.com/package/react-threaded)
[![license](https://img.shields.io/npm/l/react-threaded.svg)](./LICENSE)
[![types](https://img.shields.io/npm/types/react-threaded.svg)](https://www.npmjs.com/package/react-threaded)

- **Live demo:** [https://hussain-ahmed2.github.io/react-threaded/](https://hussain-ahmed2.github.io/react-threaded/)
- **Docs:** [https://hussain-ahmed2.github.io/react-threaded/docs](https://hussain-ahmed2.github.io/react-threaded/docs)

- **Typed end to end.** The worker function is the source of truth for inputs, outputs, progress, and per-method arguments.
- **Cancellation that works.** Hard terminate a synchronous loop and respawn it, or cancel cooperatively through `SharedArrayBuffer` and `ctx.yield()`.
- **Pools and proxies.** Fan out with bounded concurrency or expose a methods worker as a promise-based object.
- **Shared atomics.** A reactive signed 32-bit atom backed by `SharedArrayBuffer`, `Atomics`, and `BroadcastChannel`.
- **Retries and plugins.** Declarative retry backoff with observational logger, timing, and custom plugins.
- **No runtime dependencies.** ESM + CJS, React 18+, built on Blob workers and structured clone.

## Install

```bash
pnpm add react-threaded
# or
npm install react-threaded
```

React is a peer dependency: `react >= 18`.

The [live documentation](https://hussain-ahmed2.github.io/react-threaded/docs) includes setup guides
for React + Vite, Next.js, React Router, Astro, TanStack Start, Waku, RedwoodSDK, and Gatsby, plus
deployment and troubleshooting notes.

## Quick start

```tsx
import { createWorker, useWorker } from 'react-threaded'

// The function is serialised into a Blob worker.
const fibonacci = createWorker((n: number) => {
  let previous = 0n
  let current = 1n

  for (let index = 0; index < n; index += 1) {
    const next = previous + current
    previous = current
    current = next
  }

  return previous.toString()
})

export function Fibonacci() {
  const worker = useWorker(fibonacci)

  return (
    <div>
      <button onClick={() => void worker.run(50_000)} disabled={worker.status === 'running'}>
        Run
      </button>

      <p>Status: {worker.status}</p>
      <p>{worker.result ?? 'No result yet'}</p>
      {worker.error ? <p role="alert">{worker.error.message}</p> : null}
    </div>
  )
}
```

`worker.run()` returns the inferred result. The controller exposes `status`, `result`, `error`, `progress`, `durationMs`, `attempts`, `cancel`, `reset`, and `restart`.

> The handler is converted to source text and executed in an isolated worker. It must be self-contained: no imports, no closures over module variables, and no references to React state.

## Run on mount

Use `autoRun` when the first task should start as soon as the hook mounts:

```tsx
const worker = useWorker(fibonacci, {
  autoRun: { input: 50_000 },
})
```

It starts one task for the current definition. Parent renders and later changes to the `autoRun` value do not rerun it. Single-function workers use `input`; methods workers use a typed `method` and `args`. Both forms accept task `options` such as `timeoutMs` or `signal`.

## Progress and cancellation

```tsx
const search = createWorker(async (limit: number, ctx) => {
  const composite = new Uint8Array(limit + 1)
  let count = 0

  for (let value = 2; value <= limit; value += 1) {
    if (composite[value] === 0) {
      count += 1
      for (let multiple = value * value; multiple <= limit; multiple += value) {
        composite[multiple] = 1
      }
    }

    if (value % 1_000_000 === 0) {
      ctx.progress(value / limit)
      if (ctx.cancelled) return { count, cancelled: true }
      await ctx.yield()
    }
  }

  return { count, cancelled: false }
})

function Search() {
  const worker = useWorker(search)
  const progress = typeof worker.progress === 'number' ? worker.progress : 0

  return (
    <>
      <button onClick={() => void worker.run(50_000_000)}>Search</button>
      <button onClick={() => worker.cancel({ mode: 'terminate' })}>Cancel</button>
      <progress value={progress} max={1} />
    </>
  )
}
```

### Cancellation modes

| Mode | Behaviour |
| --- | --- |
| `terminate` (default) | Stops a synchronous loop immediately by terminating the worker, then respawns it on the next task. |
| `cooperative` | Sets an atomic flag and lets the function observe `ctx.cancelled`. Requires `SharedArrayBuffer` for synchronous checks; call `ctx.yield()` so queued cancellation messages can be processed in fallback environments. |

Late results are guarded by a monotonic run id, so a result from a cancelled task can never overwrite newer state.

## Transferables

Inputs are copied by default. Opt in to ownership transfer for zero-copy payloads:

```ts
const buffer = new ArrayBuffer(16 * 1024 * 1024)

const result = await worker.run(
  { buffer, passes: 3 },
  { transfer: [buffer] },
)

// The main-thread buffer is now detached.
console.log(buffer.byteLength) // 0
```

Use `transfer: 'auto'` to discover `ArrayBuffer`, `MessagePort`, and typed-array buffers in the input. Buffers returned from a worker are transferred automatically.

## Methods and proxies

Declare a record of methods instead of a single function:

```ts
const math = createWorker({
  add(a: number, b: number) {
    return a + b
  },
  fibonacci(n: number) {
    let previous = 0n
    let current = 1n
    for (let index = 0; index < n; index += 1) {
      const next = previous + current
      previous = current
      current = next
    }
    return previous.toString()
  },
})
```

### Hook proxy

```tsx
import { useWorkerProxy } from 'react-threaded'

function Demo() {
  const api = useWorkerProxy(math)

  const run = async () => {
    const sum = await api.add(1, 2)
    const digits = await api.fibonacci(50_000)
    return { sum, digits }
  }

  return <button onClick={() => void run()}>Run</button>
}
```

### Imperative proxy

```ts
import { createWorkerProxy } from 'react-threaded'

const api = createWorkerProxy(math)

try {
  await api.add(1, 2)
} finally {
  api.$dispose()
}
```

Methods can accept a final `WorkerContext` argument to access `progress`, `cancelled`, `yield`, and `post`. The proxy strips that parameter from the public signature.

## Worker pools

```tsx
import { createWorker, useWorkerPool } from 'react-threaded'

const crunchWorker = createWorker((input: { id: number; iterations: number }) => {
  let hash = 2166136261
  for (let index = 0; index < input.iterations; index += 1) {
    hash ^= (index + input.id) & 0xff
    hash = Math.imul(hash, 16777619)
  }
  return { id: input.id, hash: hash >>> 0 }
})

const pool = useWorkerPool(crunchWorker, { size: 4 })

const results = await pool.map(
  Array.from({ length: 32 }, (_, id) => ({ id, iterations: 10_000_000 })),
)

console.log(pool.stats)
// { size: 4, active: 0, queued: 0, created: 4, completed: 32, failed: 0, cancelled: 0 }
```

`useWorkerPool()` accepts the same `WorkerConfig` as `useWorker()` plus `size`. If `size` is omitted it defaults to `hardwareConcurrency - 1` (minimum 1). Changing `size` rebuilds the pool.

Imperative equivalent:

```ts
import { WorkerPool } from 'react-threaded'

const pool = new WorkerPool(crunchWorker, { size: 4 })
await pool.map(inputs)
pool.terminate()
```

## Shared atomics

```tsx
import { createSharedAtom, createWorker, useSharedAtom, useWorkerPool } from 'react-threaded'

type SharedInput = {
  readonly buffer: SharedArrayBuffer | null
  readonly iterations: number
}

const counter = createSharedAtom(0, { name: 'demo-counter' })
const increment = createWorker(({ buffer, iterations }: SharedInput) => {
  if (buffer === null) return 0

  const view = new Int32Array(buffer)
  for (let index = 0; index < iterations; index += 1) {
    Atomics.add(view, 0, 1)
  }

  return 0
})

function Counter() {
  const [value, setValue] = useSharedAtom(counter, { pollMs: 50 })
  const pool = useWorkerPool(increment, { size: 4 })

  const run = async () => {
    setValue(0)
    await pool.map(
      Array.from({ length: 4 }, () => ({
        buffer: counter.buffer,
        iterations: 5_000_000,
      })),
    )
  }

  return (
    <>
      <button onClick={() => void run()}>Run</button>
      <p>{value.toLocaleString()}</p>
    </>
  )
}
```

`SharedAtom` is intentionally numeric because `Atomics` operates on integer typed arrays. It supports `get`, `set`, `update`, `subscribe`, and `dispose`.

When shared memory is unavailable, `atom.buffer` is `null` and `atom.isShared` is `false`; the atom falls back to local state. Pass the buffer to workers only when it is non-null.

### Cross-origin isolation

`SharedArrayBuffer` requires a cross-origin isolated document:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

For Vite:

```ts
export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
```

The same headers must be present in production for shared memory to work. Without them, the library still works and falls back gracefully.

## Retries and plugins

```ts
import { createWorker, loggerPlugin, timingPlugin } from 'react-threaded'

const worker = createWorker(flakyHandler, {
  retry: { attempts: 4, delayMs: 500 },
  plugins: [
    loggerPlugin({ onLog: (entry) => sendToTelemetry(entry) }),
    timingPlugin({ onTiming: (entry) => recordLatency(entry.durationMs) }),
  ],
  onPluginError: (error, plugin) => {
    console.warn(`plugin ${plugin.name} failed`, error)
  },
})
```

Plugins are observational: they cannot alter results, and a thrown plugin error is isolated so production tasks keep running. Custom plugins can implement:

```ts
import type { WorkerPlugin } from 'react-threaded'

const metrics: WorkerPlugin = {
  name: 'metrics',
  onWorkerCreated(meta) {},
  onWorkerTerminated(meta) {},
  onTaskStart(meta) {},
  onTaskSettled(meta) {},
  onTaskError(meta) {},
  onRetry(meta) {},
}
```

## Configuration reference

### `WorkerConfig`

| Option | Type | Description |
| --- | --- | --- |
| `name` | `string` | Stable name used in plugins and errors. |
| `plugins` | `readonly WorkerPlugin[]` | Observational lifecycle hooks. |
| `retry` | `{ attempts: number; delayMs?: number }` | Retry transient task failures. |
| `onPluginError` | `(error: Error, plugin: WorkerPlugin) => void` | Called when a plugin throws. |

### `TaskOptions`

| Option | Type | Description |
| --- | --- | --- |
| `transfer` | `readonly Transferable[] \| 'auto'` | Transfer input ownership. |
| `signal` | `AbortSignal` | Cancel the task when aborted. |
| `timeoutMs` | `number` | Terminate the worker on timeout. |
| `onProgress` | `(value: unknown) => void` | Per-task progress callback. |
| `onMessage` | `(message: unknown) => void` | Per-task side-channel messages from `ctx.post`. |
| `onRetry` | `(meta: RetryMeta) => void` | Fired before each retry. |

### `useWorker` config

Extends `WorkerConfig` with `eager`, `autoRun`, `onSuccess`, `onError`, `onProgress`, `onMessage`, and `onRetry`. `autoRun` takes the typed initial task (`input` for single-function workers, or `method` plus `args` for methods workers) and runs once per definition.

### Errors

All errors are exported and marked with `name`:

- `WorkerUnsupportedError`
- `WorkerUsageError`
- `WorkerDisposedError`
- `WorkerTimeoutError`
- `WorkerTaskError`
- `CancelledError`

Use `toError(unknown)` to normalise unknown throws and `isSerializedWorkerError(value)` to narrow worker messages.

## Imperative handles

For non-React code, use `WorkerHandle` directly:

```ts
import { WorkerHandle } from 'react-threaded'

const handle = new WorkerHandle(fibonacci, { name: 'fibonacci' })

try {
  const result = await handle.run(50_000, { timeoutMs: 10_000 })
  console.log(result)
} finally {
  handle.dispose()
}
```

Use `handle.call(method, args, options)` for methods workers. The lower-level `invoke(method, args, options)` is used internally by proxies and pools.

## Browser support

- Web Workers and structured clone: required.
- `SharedArrayBuffer` / `Atomics`: optional; enables synchronous cooperative cancellation and `SharedAtom`.
- `BroadcastChannel`: optional; mirrors cross-tab atom updates.
- `AbortSignal`, `Blob`, and `URL.createObjectURL`: required by the default runtime.

If `Worker` is unavailable, `supported` is `false` and tasks reject with `WorkerUnsupportedError`.

### Content Security Policy

Workers are created from Blob URLs, so allow them explicitly:

```http
Content-Security-Policy: worker-src blob:;
```

No `eval` or `new Function` is used at runtime.

## Architecture

```
src/
  features/
    worker/        createWorker, WorkerHandle, useWorker, proxies
    pool/          WorkerPool, useWorkerPool
    shared-state/  SharedAtom, useSharedAtom
    plugins/       loggerPlugin, timingPlugin, contracts
  shared/          errors, environment checks, transferables, timing
```

Design notes:

- Handlers are serialised into a Blob worker with a small message protocol: `init`, `ready`, `invoke`, `cancel`, `progress`, `event`, `result`, `error`.
- Tasks are serialised per worker through a promise chain, so one worker never interleaves two calls.
- Cancellation uses an atomic flag when shared memory is available; otherwise the default terminate-and-respawn strategy is always reliable.
- Output transferables are collected automatically; input transfer is explicit because it is destructive.
- React state is driven by `useSyncExternalStore` for shared atoms and run-id guards for worker state.

## Development

This package lives in a pnpm monorepo. From the repository root:

```bash
pnpm install
pnpm --filter react-threaded typecheck
pnpm --filter react-threaded test
pnpm --filter react-threaded build
pnpm dev          # demo site at http://localhost:5173
```

## Publishing

```bash
pnpm --filter react-threaded typecheck
pnpm --filter react-threaded test
pnpm --filter react-threaded build
pnpm --filter react-threaded publish
```

`prepublishOnly` runs typecheck, tests, and build automatically. The package publishes ESM, CJS, and type declarations with npm provenance enabled. Provenance requires publishing from a supported CI provider with OIDC (for example GitHub Actions with `id-token: write`).

Dry-run the package contents first:

```bash
cd packages/react-threaded
npm pack --dry-run
```

## License

MIT
