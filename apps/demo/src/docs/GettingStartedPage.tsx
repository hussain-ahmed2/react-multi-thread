import { Link } from 'react-router-dom'
import { CodeBlock } from '../components/CodeBlock'
import { ArrowIcon } from '../components/Icons'
import { Callout } from './components/Callout'
import { DocPage, DocSection } from './components/DocPage'
import { firstWorkerCode, installCode, progressCode } from './snippets'

export function GettingStartedPage() {
  return (
    <DocPage
      eyebrow="Start here"
      title="Getting started"
      lede="Install the package, define a self-contained worker, and call it from a hook. The worker boundary is inferred from the function you already wrote."
    >
      <DocSection id="install" title="Install">
        <p>Install the package in the app that renders the component:</p>
        <CodeBlock code={installCode} title="terminal" />
        <p>
          React 18 or newer is a peer dependency. The package includes ESM and CommonJS builds plus
          type declarations, and ships no runtime dependencies.
        </p>
      </DocSection>

      <DocSection
        id="define"
        title="Define a worker"
        lede="A worker is a function. It may be synchronous or async, and its input and output types become the task contract."
      >
        <CodeBlock code={firstWorkerCode} title="Fibonacci.tsx" />
        <Callout tone="warning" title="Keep the handler self-contained">
          <p>
            The handler is copied into a Blob worker as source. It cannot close over module
            variables, component props, or imports. Pass everything it needs as arguments, and
            return structured-cloneable values.
          </p>
        </Callout>
        <p>
          This restriction is what makes the package bundler-agnostic. There is no worker entry file
          to configure, and no <code>new URL(..., import.meta.url)</code> convention to remember.
        </p>
      </DocSection>

      <DocSection
        id="run"
        title="Run it from React"
        lede="useWorker owns the worker lifecycle and exposes the current status, result, progress, and error."
      >
        <p>
          Call <code>worker.run(input)</code> from an event handler or an effect. The returned
          promise resolves with the result and also updates the controller state.
        </p>
        <CodeBlock
          code={`const worker = useWorker(fib)

const result = await worker.run(50_000)

console.log(worker.status)    // 'success'
console.log(worker.result)    // the returned string
console.log(worker.durationMs)`}
          title="Calling the worker"
        />
        <p>
          The hook creates the worker on mount and terminates it on unmount. Set{' '}
          <code>eager: true</code> if you want the worker spawned before the first task.
        </p>
      </DocSection>

      <DocSection
        id="progress"
        title="Progress and cancellation"
        lede="Long tasks can report progress and stop on request. Hard cancellation works even for a tight synchronous loop."
      >
        <CodeBlock code={progressCode} title="CancellablePrime.tsx" />
        <ul>
          <li>
            <strong>Terminate</strong> is the default. It stops the worker immediately and respawns
            it on the next task.
          </li>
          <li>
            <strong>Cooperative</strong> asks the task to stop. The handler must check{' '}
            <code>ctx.cancelled</code> or call <code>ctx.yield()</code> regularly.
          </li>
          <li>
            Pass an <code>AbortSignal</code> in the task options to cancel when a request or
            component unmounts.
          </li>
        </ul>
      </DocSection>

      <DocSection id="options" title="Task options">
        <p>
          The second argument to <code>run()</code> controls cancellation, timeouts, transferables,
          and callbacks for that task:
        </p>
        <CodeBlock
          code={`await worker.run(input, {
  transfer: 'auto',             // or an explicit Transferable[]
  signal: controller.signal,
  timeoutMs: 10_000,
  onProgress: (value) => {},
  onMessage: (message) => {},
  onRetry: ({ attempt, error }) => {},
})`}
          title="TaskOptions"
        />
        <p>
          Use <code>transfer: 'auto'</code> to discover ArrayBuffers, typed arrays, MessagePorts,
          ImageBitmaps, and OffscreenCanvases in the input. Ownership moves to the worker; the
          main-thread buffer becomes detached.
        </p>
      </DocSection>

      <DocSection id="next" title="Next steps">
        <div className="doc-link-grid">
          <Link to="/docs/concepts">Core concepts — how tasks, memory, and cancellation work</Link>
          <Link to="/docs/api">API reference — every hook, factory, and type</Link>
          <Link to="/docs/frameworks/vite">React + Vite — the reference setup</Link>
          <Link to="/docs/deployment">Deployment — headers, fallbacks, and platform notes</Link>
        </div>
        <div className="doc-next">
          <Link className="button button--primary" to="/docs/concepts">
            Read core concepts
            <ArrowIcon width={16} height={16} />
          </Link>
          <Link className="button" to="/playground">
            Try the live demos
          </Link>
        </div>
      </DocSection>
    </DocPage>
  )
}
