import { Link } from 'react-router-dom'
import { CodeBlock } from '../components/CodeBlock'
import { Callout } from './components/Callout'
import { DocPage, DocSection } from './components/DocPage'

export function TroubleshootingPage() {
  return (
    <DocPage
      eyebrow="Help"
      title="Troubleshooting"
      lede="The failures below account for nearly every report. Each one has a concrete check and a fix."
    >
      <DocSection
        id="shared-array-buffer"
        title="SharedArrayBuffer is not defined"
        lede="The page is not cross-origin isolated."
      >
        <p>
          Check the console: <code>crossOriginIsolated</code> must be <code>true</code>. Send both
          headers on the document response:
        </p>
        <CodeBlock
          code={`Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp`}
          title="headers"
        />
        <p>
          Development and preview servers need their own configuration. A static host will not read{' '}
          <code>vite.config.ts</code>. See the deployment guides for Vercel, Netlify, and Cloudflare
          Pages. On GitHub Pages, shared memory is not available.
        </p>
        <Callout tone="note" title="The fallback is intentional">
          <p>
            When <code>SharedArrayBuffer</code> is unavailable, <code>createSharedAtom</code> keeps
            working locally, with <code>isShared: false</code> and <code>buffer: null</code>. The
            worker accepts <code>null</code> and falls back to its local count.
          </p>
        </Callout>
      </DocSection>

      <DocSection
        id="worker-blocked"
        title="The worker is blocked by CSP"
        lede="Blob workers need an explicit source."
      >
        <p>
          If the console reports a Content Security Policy violation, add{' '}
          <code>worker-src blob:</code>. Do not add <code>unsafe-eval</code>; the library does not
          use it.
        </p>
        <CodeBlock
          code={`Content-Security-Policy:
  script-src 'self';
  worker-src 'self' blob:;`}
          title="CSP"
        />
      </DocSection>

      <DocSection
        id="handler"
        title="The handler cannot see an import or variable"
        lede="The handler runs in a separate thread, from its own source."
      >
        <p>
          A handler cannot close over module imports, component props, or global app state. Pass
          values as arguments. This fails:
        </p>
        <CodeBlock
          code={`import { parse } from './parser'

// parse is not available inside the worker.
const worker = createWorker((text: string) => parse(text))`}
          title="Incorrect"
        />
        <p>Move the logic into the handler, or pass the data the parser needs:</p>
        <CodeBlock
          code={`const worker = createWorker(({ text, options }) => {
  // Keep the implementation self-contained.
  return tokenize(text, options)
})`}
          title="Correct"
        />
      </DocSection>

      <DocSection
        id="dataclone"
        title="DataCloneError"
        lede="Something in the argument or result cannot be structured-cloned."
      >
        <p>
          Functions, class instances with methods, React elements, DOM nodes, and symbols cannot
          cross the boundary. Return plain objects, arrays, maps, sets, dates, typed arrays, or
          ArrayBuffers. If you need a class on the main thread, return its fields and reconstruct it
          there.
        </p>
      </DocSection>

      <DocSection
        id="next-window"
        title="window is not defined in Next.js"
        lede="The worker code ran during server rendering."
      >
        <p>
          Move the hook into a Client Component with <code>&apos;use client&apos;</code>. The worker
          definition itself is safe to import, but the component that calls the hook must be a client
          boundary. Server Components cannot own a worker.
        </p>
        <p>
          If a component must stay server-rendered and only start a worker after hydration, render a
          small client wrapper or guard creation in an effect.
        </p>
      </DocSection>

      <DocSection
        id="unknown-method"
        title="Unknown worker method"
        lede="A proxy called a method that is not on the definition."
      >
        <p>
          Method names are checked at runtime in the worker. If the name is assembled dynamically,
          the type system cannot help. Keep proxy calls literal, or use{' '}
          <code>worker.call(&apos;method&apos;, args)</code> with a typed key.
        </p>
      </DocSection>

      <DocSection
        id="not-terminating"
        title="The worker seems to keep running"
        lede="Check the cancellation mode and the handler loop."
      >
        <ul>
          <li>
            <code>cancel()</code> defaults to <code>terminate</code>, which kills the worker
            immediately.
          </li>
          <li>
            <code>cooperative</code> only works if the handler checks <code>ctx.cancelled</code> or
            awaits <code>ctx.yield()</code>.
          </li>
          <li>
            A pool keeps idle workers alive until <code>terminate()</code> or unmount. That is a
            feature, not a leak.
          </li>
          <li>React Strict Mode mounts twice in development; the first worker is disposed on cleanup.</li>
        </ul>
      </DocSection>

      <DocSection
        id="slower"
        title="The worker is slower than the main thread"
        lede="A short task pays a fixed startup cost."
      >
        <p>
          Worker creation, the readiness handshake, structured clone, and message serialization cost
          roughly a few milliseconds each. For a 20ms task, the main thread may win. For a 500ms
          task, the worker usually breaks even; beyond that, the gap grows in the worker&apos;s
          favor. The real metric is dropped frames, not raw elapsed time.
        </p>
        <p>
          Batch small operations, reuse a worker or a pool, and avoid transferring data you do not
          need to move. Measure with the Performance panel rather than guessing.
        </p>
      </DocSection>

      <DocSection id="base-path" title="A blank page after deploying to a subpath">
        <p>
          The HTML loaded, but the asset URLs or the router base are wrong. Set the bundler base and
          the router basename to the same path:
        </p>
        <CodeBlock
          code={`// vite.config.ts
export default defineConfig({ base: '/my-app/' })

// main.tsx
<BrowserRouter basename="/my-app">`}
          title="Subpath"
        />
        <p>
          The demo follows this pattern with <code>DEMO_BASE</code> and{' '}
          <code>import.meta.env.BASE_URL</code>.
        </p>
      </DocSection>

      <DocSection
        id="coep-breaks"
        title="COEP breaks images, fonts, or embeds"
        lede="Cross-origin isolation is a site-wide policy."
      >
        <p>
          <code>Cross-Origin-Embedder-Policy: require-corp</code> requires cross-origin resources to
          opt in with CORP or CORS. Self-host the resource, add{' '}
          <code>Cross-Origin-Resource-Policy: cross-origin</code> on your own CDN, or avoid global
          COEP and enable it only on routes that need shared memory.
        </p>
        <Callout tone="warning" title="Measure the need first">
          <p>
            If you do not use shared atoms, remove COOP/COEP. The rest of the library does not
            require cross-origin isolation.
          </p>
        </Callout>
      </DocSection>

      <div className="doc-next">
        <Link className="button button--primary" to="/docs/deployment">
          Deployment guides
        </Link>
        <Link className="button" to="/playground">
          Try the playground
        </Link>
      </div>
    </DocPage>
  )
}
