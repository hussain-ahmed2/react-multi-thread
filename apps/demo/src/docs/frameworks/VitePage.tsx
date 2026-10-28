import { Link } from 'react-router-dom'
import { CodeBlock } from '../../components/CodeBlock'
import { Callout } from '../components/Callout'
import { DocPage, DocSection } from '../components/DocPage'
import { firstWorkerCode, installCode, viteHeadersCode } from '../snippets'

export function VitePage() {
  return (
    <DocPage
      eyebrow="Frameworks"
      title="React + Vite"
      lede="The reference setup. Vite needs no plugin for react-threaded; the only optional configuration is cross-origin isolation for shared atomics."
    >
      <DocSection id="install" title="Install">
        <CodeBlock code={installCode} title="terminal" />
        <p>
          Add the package to the app that renders the component. There is no worker entry file and
          no Vite plugin; definitions become Blob workers at runtime.
        </p>
      </DocSection>

      <DocSection id="component" title="Use a worker">
        <CodeBlock code={firstWorkerCode} title="src/Fibonacci.tsx" />
        <p>
          Import the component normally. Vite processes the source, and the worker is created on
          mount. In development, React Strict Mode may mount twice; the hook terminates the first
          worker on cleanup.
        </p>
      </DocSection>

      <DocSection
        id="shared-memory"
        title="Enable shared atomics"
        lede="SharedArrayBuffer requires cross-origin isolation in every browser."
      >
        <p>
          Add the two headers to the dev server and preview server. Production needs the same
          headers from your host — see the deployment guide for each platform.
        </p>
        <CodeBlock code={viteHeadersCode} title="vite.config.ts" />
        <Callout tone="warning" title="Headers are not bundled">
          <p>
            Vite headers apply to <code>vite dev</code> and <code>vite preview</code> only. A static
            host will not read this config. Configure Vercel, Netlify, or Cloudflare separately.
          </p>
        </Callout>
        <p>
          Check the result in the browser console: <code>crossOriginIsolated</code> should be{' '}
          <code>true</code>. Without it, <code>createSharedAtom</code> falls back to local mode and
          the rest of the library still works.
        </p>
      </DocSection>

      <DocSection id="csp" title="Content Security Policy">
        <p>
          Workers are created from Blob URLs. If you set a CSP, allow them explicitly:
        </p>
        <CodeBlock
          code={`Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  worker-src 'self' blob:;`}
          title="CSP"
        />
        <p>
          No <code>unsafe-eval</code> is required. The runtime and the serialized handler are
          embedded in the Blob, not evaluated through <code>new Function</code>.
        </p>
      </DocSection>

      <DocSection id="subpath" title="Deploying under a subpath">
        <p>
          Set Vite&apos;s <code>base</code> and React Router&apos;s <code>basename</code> together.
          If the demo is served from <code>/react-threaded/</code>:
        </p>
        <CodeBlock
          code={`// vite.config.ts
export default defineConfig({
  base: '/react-threaded/',
})

// main.tsx
<BrowserRouter basename="/react-threaded">
  <App />
</BrowserRouter>`}
          title="Base path"
        />
        <p>
          The docs site itself uses <code>import.meta.env.BASE_URL</code> for the router basename,
          so the same build works at the root or under a subpath.
        </p>
      </DocSection>

      <div className="doc-next">
        <Link className="button button--primary" to="/docs/frameworks/nextjs">
          Next.js recipe
        </Link>
        <Link className="button" to="/docs/deployment">
          Deployment overview
        </Link>
      </div>
    </DocPage>
  )
}
