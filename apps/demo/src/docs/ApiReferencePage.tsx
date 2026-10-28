import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CodeBlock } from '../components/CodeBlock'
import { Callout } from './components/Callout'
import { DocPage, DocSection } from './components/DocPage'
import { autoRunCode, installCode } from './snippets'

type ApiEntryProps = {
  readonly signature: string
  readonly returns: string
  readonly children: ReactNode
}

function ApiEntry({ signature, returns, children }: ApiEntryProps) {
  return (
    <div className="api-entry">
      <div className="api-entry__head">
        <code>{signature}</code>
        <span>{returns}</span>
      </div>
      <div className="api-entry__body">{children}</div>
    </div>
  )
}

export function ApiReferencePage() {
  return (
    <DocPage
      eyebrow="API reference"
      title="The public surface"
      lede="Named exports only. Every factory and hook is tree-shakeable, and its types are inferred from the handler you pass in."
    >
      <CodeBlock code={installCode} title="terminal" />

      <DocSection id="worker" title="Worker factory">
        <ApiEntry signature="createWorker(handler, config?)" returns="WorkerDefinition">
          <p>
            Accepts a self-contained function or a record of named methods. The returned definition
            is a serializable description; it does not spawn a worker until a hook, handle, or pool
            uses it.
          </p>
          <ul>
            <li>
              <code>name</code> labels the worker in plugin events and DevTools.
            </li>
            <li>
              <code>retry</code> is <code>{'{ attempts, delayMs? }'}</code>.
            </li>
            <li>
              <code>plugins</code> observes lifecycle events.
            </li>
            <li>
              <code>onPluginError</code> receives plugin failures.
            </li>
          </ul>
        </ApiEntry>

        <ApiEntry signature="new WorkerHandle(definition, config?)" returns="WorkerHandle">
          <p>
            An imperative handle for code outside React: tests, state machines, or a shared service.
            It exposes <code>run</code>, <code>call</code>, <code>cancel</code>, <code>dispose</code>,
            and the current state, without a component lifecycle.
          </p>
        </ApiEntry>
      </DocSection>

      <DocSection id="use-worker" title="useWorker">
        <ApiEntry signature="useWorker(definition, config?)" returns="WorkerController">
          <p>
            Creates a worker on mount, terminates it on unmount, and returns the state machine plus
            task methods. Config extends <code>WorkerConfig</code> with <code>eager</code>,{' '}
            <code>autoRun</code>, <code>onSuccess</code>, <code>onError</code>,{' '}
            <code>onProgress</code>, <code>onMessage</code>, and <code>onRetry</code>.
          </p>
          <CodeBlock
            code={`const worker = useWorker(fib, { eager: true })

worker.status       // idle | running | success | error | cancelled
worker.result       // Output | null
worker.error        // Error | null
worker.progress     // unknown
worker.durationMs   // number | null
worker.attempts     // number
worker.supported    // false when Workers are unavailable

await worker.run(50_000, { timeoutMs: 10_000 })
worker.cancel({ mode: 'terminate' })
worker.reset()
worker.restart()`}
            title="Controller"
          />
          <p>
            <code>autoRun</code> starts one typed initial task on mount. It does not rerun on parent
            renders or when the <code>autoRun</code> value changes; use <code>run()</code> or{' '}
            <code>call()</code> for later tasks.
          </p>
          <CodeBlock code={autoRunCode} title="Run on mount" />
        </ApiEntry>
      </DocSection>

      <DocSection id="proxy" title="Proxy API">
        <ApiEntry signature="createWorkerProxy(definition, config?)" returns="WorkerProxy">
          <p>
            Turns every method in a methods-style definition into a typed async function. Calls are
            serialized through the worker and support the same task options. A <code>$dispose</code>{' '}
            method terminates the worker.
          </p>
        </ApiEntry>
        <ApiEntry signature="useWorkerProxy(definition, config?)" returns="WorkerProxy">
          <p>
            The React-bound version. The proxy is created once and disposed on unmount. Use it for
            cohesive APIs such as <code>hash</code>, <code>sign</code>, and <code>verify</code>{' '}
            instead of calling <code>worker.call(&apos;hash&apos;, …)</code>.
          </p>
        </ApiEntry>
      </DocSection>

      <DocSection id="pool" title="Worker pools">
        <ApiEntry signature="useWorkerPool(definition, { size })" returns="WorkerPoolController">
          <p>
            A bounded pool with live counters. <code>run()</code> schedules one task,{' '}
            <code>map()</code> fans out many, and <code>call()</code> targets a method.{' '}
            <code>stats</code> reports size, active, queued, created, completed, failed, and
            cancelled counts.
          </p>
          <ul>
            <li>
              Default size is <code>hardwareConcurrency - 1</code>, capped for sanity.
            </li>
            <li>Workers are created lazily as tasks arrive.</li>
            <li>
              <code>terminate()</code> rejects queued tasks and stops active ones.
            </li>
          </ul>
        </ApiEntry>
        <ApiEntry signature="new WorkerPool(definition, { size })" returns="WorkerPool">
          <p>
            The imperative pool used by the hook. Useful in a service layer, a test harness, or a
            non-React application.
          </p>
        </ApiEntry>
        <ApiEntry signature="getDefaultPoolSize()" returns="number">
          <p>Returns the size the hook would choose on this device.</p>
        </ApiEntry>
      </DocSection>

      <DocSection id="shared-state" title="Shared state">
        <ApiEntry signature="createSharedAtom(value, options?)" returns="SharedAtom">
          <p>
            A reactive signed 32-bit integer backed by <code>SharedArrayBuffer</code> when available.
            Options: <code>name</code> for the BroadcastChannel and <code>shared: false</code> to
            force local mode. Methods: <code>get</code>, <code>set</code>, <code>update</code>,{' '}
            <code>subscribe</code>, <code>dispose</code>.
          </p>
        </ApiEntry>
        <ApiEntry signature="useSharedAtom(atom, { pollMs })" returns="[value, setValue]">
          <p>
            Binds an atom to React through <code>useSyncExternalStore</code>. Direct{' '}
            <code>Atomics</code> writes in workers are picked up by polling; default interval is
            100ms. The setter accepts a value or an updater.
          </p>
        </ApiEntry>
        <Callout tone="note" title="Numbers only">
          <p>
            Atomics operates on integer typed arrays. Use a message or a transferable for objects,
            strings, and floats.
          </p>
        </Callout>
      </DocSection>

      <DocSection id="plugins" title="Plugins">
        <ApiEntry signature="loggerPlugin(config)" returns="WorkerPlugin">
          <p>
            Emits structured <code>LogEntry</code> records for worker creation, task start, progress,
            retry, success, error, cancellation, and termination. Provide <code>onLog</code> and
            optionally a level filter.
          </p>
        </ApiEntry>
        <ApiEntry signature="timingPlugin(config)" returns="WorkerPlugin">
          <p>
            Collects per-attempt duration samples with the worker name, method, and outcome. Provide{' '}
            <code>onSample</code> to forward them to a latency dashboard.
          </p>
        </ApiEntry>
        <ApiEntry signature="WorkerPlugin" returns="object">
          <p>
            A plugin is an object of optional hooks: <code>onWorkerCreated</code>,{' '}
            <code>onWorkerTerminated</code>, <code>onTaskStart</code>, <code>onProgress</code>,{' '}
            <code>onRetry</code>, <code>onTaskSettled</code>. Hooks are observational and cannot
            alter results.
          </p>
        </ApiEntry>
      </DocSection>

      <DocSection id="errors" title="Errors and environment">
        <ApiEntry signature="CancelledError" returns="Error">
          <p>Thrown when a task is cancelled. Includes whether the cancel was cooperative.</p>
        </ApiEntry>
        <ApiEntry signature="WorkerTimeoutError" returns="Error">
          <p>Thrown when <code>timeoutMs</code> elapses. The worker is terminated.</p>
        </ApiEntry>
        <ApiEntry signature="WorkerDisposedError" returns="Error">
          <p>Thrown when a task is submitted to a disposed hook, handle, or pool.</p>
        </ApiEntry>
        <ApiEntry signature="WorkerTaskError" returns="Error">
          <p>Wraps an error thrown inside the worker, preserving name, message, and stack.</p>
        </ApiEntry>
        <ApiEntry signature="WorkerUnsupportedError" returns="Error">
          <p>Thrown when the environment cannot create Blob workers.</p>
        </ApiEntry>
        <ApiEntry signature="WorkerUsageError" returns="Error">
          <p>Thrown for invalid usage, such as an unknown method name.</p>
        </ApiEntry>
        <ApiEntry signature="isWorkerSupported()" returns="boolean">
          <p>Checks for Worker, Blob, URL, and createObjectURL support.</p>
        </ApiEntry>
        <ApiEntry signature="isSharedMemoryAvailable()" returns="boolean">
          <p>
            Checks for <code>SharedArrayBuffer</code>, <code>Atomics</code>, and cross-origin
            isolation.
          </p>
        </ApiEntry>
        <ApiEntry signature="isBroadcastChannelSupported()" returns="boolean">
          <p>Checks for BroadcastChannel, used by shared atom subscriptions.</p>
        </ApiEntry>
        <ApiEntry signature="getHardwareConcurrency()" returns="number">
          <p>Reads <code>navigator.hardwareConcurrency</code> with a safe fallback.</p>
        </ApiEntry>
      </DocSection>

      <DocSection id="types" title="Types worth importing">
        <p>
          All types are exported from the package root. The most common are:
        </p>
        <CodeBlock
          code={`import type {
  WorkerDefinition,
  WorkerController,
  WorkerContext,
  TaskOptions,
  CancelTaskOptions,
  WorkerRetryConfig,
  WorkerStatus,
  WorkerProxy,
  WorkerPoolController,
  PoolStats,
  SharedAtom,
  SharedAtomBinding,
  WorkerPlugin,
  LogEntry,
  TimingEntry,
} from 'react-threaded'`}
          title="Types"
        />
        <p>
          Derive your own aliases from a definition with <code>WorkerInput</code>,{' '}
          <code>WorkerOutput</code>, <code>WorkerMethodArgs</code>, and{' '}
          <code>WorkerMethodResult</code>.
        </p>
      </DocSection>

      <div className="doc-next">
        <Link className="button button--primary" to="/docs/frameworks/vite">
          Framework recipes
        </Link>
        <Link className="button" to="/playground">
          Exercise the API
        </Link>
      </div>
    </DocPage>
  )
}
