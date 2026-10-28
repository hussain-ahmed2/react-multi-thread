import { Link } from 'react-router-dom'
import { CodeBlock } from '../components/CodeBlock'
import { Callout } from './components/Callout'
import { DocPage, DocSection } from './components/DocPage'
import { progressCode, sharedAtomCode } from './snippets'

export function ConceptsPage() {
  return (
    <DocPage
      eyebrow="Start here"
      title="Core concepts"
      lede="Six ideas explain the whole library: a serialized handler, a task queue per worker, structured clone, transferable ownership, two cancellation strategies, and optional shared memory."
    >
      <DocSection
        id="execution"
        title="Execution model"
        lede="Each definition becomes a dedicated worker with one task queue."
      >
        <p>
          <code>createWorker()</code> serializes your handler and creates a definition. When a hook,
          handle, or pool instantiates it, the definition becomes a Blob URL and a real{' '}
          <code>Worker</code>. The worker announces readiness, then accepts tasks.
        </p>
        <p>
          Tasks sent to the same worker are serialized. Calling three proxy methods concurrently
          queues three tasks; they never interleave inside the handler. Use a pool when you want
          concurrency across tasks.
        </p>
        <CodeBlock
          code={`const worker = new Worker(blobUrl)

worker.postMessage({ type: 'init', cancelBuffer })
worker.postMessage({ type: 'invoke', id, method, args })

// Worker -> main: progress, event, result, or error
// Messages are matched to the task by id.`}
          title="Wire protocol (simplified)"
        />
        <p>
          A definition can be a single function or a map of named methods. A methods definition is
          what powers the proxy API.
        </p>
      </DocSection>

      <DocSection id="serialization" title="Serialization">
        <p>
          Arguments and results cross the thread boundary with the structured clone algorithm. Plain
          objects, arrays, maps, sets, dates, typed arrays, and ArrayBuffers work. Functions,
          class instances with methods, DOM nodes, and React elements do not.
        </p>
        <p>
          The handler itself is not cloned as a closure. Its source is embedded in the worker
          runtime, which is why it must be self-contained. Production builds may rename variables;
          the handler still runs because it only references its own arguments and globals available
          in a worker.
        </p>
        <Callout tone="note" title="Errors are serialized">
          <p>
            A thrown value is converted to a name, message, and stack before crossing threads. In
            React state you receive an <code>Error</code>, not the original object identity.
          </p>
        </Callout>
      </DocSection>

      <DocSection
        id="transferables"
        title="Transferables"
        lede="Move large buffers instead of copying them."
      >
        <p>
          Pass an explicit list of transferables, or use <code>transfer: 'auto'</code>. Ownership
          moves to the worker and the sender&apos;s buffer is detached. Outputs are discovered
          automatically, so a returned typed array can be transferred back.
        </p>
        <CodeBlock
          code={`const buffer = new ArrayBuffer(16 * 1024 * 1024)

const result = await worker.run(
  { buffer, passes: 3 },
  { transfer: [buffer] },
)

console.log(buffer.byteLength) // 0 — ownership moved`}
          title="Transfer ownership"
        />
        <p>
          Transfer is the right default for image data, audio, large arrays, and parsed file
          contents. Do not transfer a buffer you still need on the main thread; clone it instead.
        </p>
      </DocSection>

      <DocSection
        id="cancellation"
        title="Cancellation"
        lede="Two strategies for two different kinds of work."
      >
        <p>
          <strong>Terminate</strong> is immediate and works on any handler, including a tight
          synchronous loop. The worker is killed and a fresh one is created for the next task. Use it
          for runaway or obsolete work.
        </p>
        <p>
          <strong>Cooperative</strong> cancellation asks the task to stop at a safe point. Check{' '}
          <code>ctx.cancelled</code> or call <code>await ctx.yield()</code> inside long loops. This
          preserves partial state and avoids worker startup cost.
        </p>
        <CodeBlock code={progressCode} title="Cooperative cancellation" />
        <Callout tone="warning" title="Late results are ignored">
          <p>
            Every run has an id and a generation counter. A cancelled or superseded task cannot
            overwrite the result of a newer task, even if its message arrives late.
          </p>
        </Callout>
      </DocSection>

      <DocSection
        id="shared-memory"
        title="Shared memory"
        lede="SharedAtom is numeric because Atomics is numeric."
      >
        <p>
          <code>createSharedAtom(0)</code> allocates a <code>SharedArrayBuffer</code> and exposes
          <code>get</code>, <code>set</code>, <code>update</code>, and <code>subscribe</code>. Pass
          the buffer to workers and mutate it with <code>Atomics</code>. <code>useSharedAtom</code>{' '}
          subscribes React to the value and polls for writes made directly through Atomics.
        </p>
        <CodeBlock code={sharedAtomCode} title="SharedCounter.tsx" />
        <p>
          Shared memory requires cross-origin isolation: <code>Cross-Origin-Opener-Policy:
          same-origin</code> and <code>Cross-Origin-Embedder-Policy: require-corp</code>. Without
          those headers, <code>isShared</code> is <code>false</code>, <code>buffer</code> is{' '}
          <code>null</code>, and the atom falls back to a local store so the same component still
          renders.
        </p>
        <Callout tone="warning" title="One writer is not enough">
          <p>
            Atomics make individual operations safe, not compound ones. Use <code>Atomics.add</code>{' '}
            or <code>Atomics.compareExchange</code> for updates. Do not read, modify, and write
            separately unless you own the value alone.
          </p>
        </Callout>
      </DocSection>

      <DocSection id="lifecycle" title="Lifecycle, retries, and plugins">
        <p>
          A controller moves through <code>idle</code>, <code>running</code>, <code>success</code>,{' '}
          <code>error</code>, and <code>cancelled</code>. <code>restart()</code> replaces the worker;
          <code>reset()</code> clears the state without touching it; unmount terminates it.
        </p>
        <p>
          <code>retry</code> retries thrown tasks with a delay. <code>onRetry</code> receives the
          attempt and error. Plugins observe worker creation, task start, progress, retries, and
          settlement. Plugin errors go to <code>onPluginError</code> and never change the task result.
        </p>
      </DocSection>

      <DocSection id="boundaries" title="What belongs in a worker">
        <div className="prose-columns">
          <div>
            <h3>Good fit</h3>
            <ul>
              <li>Parsing, aggregating, and transforming large datasets.</li>
              <li>Image, audio, and canvas work with OffscreenCanvas.</li>
              <li>Hashing, compression, encoding, and cryptography.</li>
              <li>Simulations, pathfinding, and physics that can run in batches.</li>
              <li>Any loop that would drop frames for more than a few milliseconds.</li>
            </ul>
          </div>
          <div>
            <h3>Poor fit</h3>
            <ul>
              <li>Tiny tasks where startup and messaging dominate.</li>
              <li>Network requests — browsers already handle those off-thread.</li>
              <li>DOM access. Workers cannot read or mutate the document.</li>
              <li>Work that needs React state or component closures inside the loop.</li>
            </ul>
          </div>
        </div>
        <p>
          When in doubt, measure. A worker adds roughly a startup handshake and a structured clone.
          For tasks above a few milliseconds, that cost is usually invisible next to the work itself.
        </p>
      </DocSection>

      <div className="doc-next">
        <Link className="button button--primary" to="/docs/api">
          Read the API reference
        </Link>
        <Link className="button" to="/docs/troubleshooting">
          Troubleshooting
        </Link>
      </div>
    </DocPage>
  )
}
