import { Link } from 'react-router-dom'
import { CodeBlock } from '../../components/CodeBlock'
import { Callout } from '../components/Callout'
import { DocPage, DocSection } from '../components/DocPage'
import { installCode } from '../snippets'

const startRouteCode = `// src/routes/hash.tsx
import { createFileRoute } from '@tanstack/react-router'
import { createWorker, useWorker } from 'react-threaded'

const hash = createWorker(async (text: string) => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  )
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
})

function HashRoute() {
  const worker = useWorker(hash)

  return (
    <button type="button" onClick={() => void worker.run('react-threaded')}>
      {worker.result ?? 'Hash'}
    </button>
  )
}

export const Route = createFileRoute('/hash')({
  ssr: false,
  component: HashRoute,
})`

const startHeadersCode = `// src/start.ts
import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from '@tanstack/react-start'

const crossOriginIsolation = createMiddleware().server(async ({ next }) => {
  const result = await next()
  result.response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  result.response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
  return result
})

export const startInstance = createStart(() => ({
  requestMiddleware: [
    createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === 'serverFn' }),
    crossOriginIsolation,
  ],
}))`

export function TanStackStartPage() {
  return (
    <DocPage
      eyebrow="Frameworks"
      title="TanStack Start"
      lede="TanStack Start renders routes on the server by default. Keep the component that owns a worker behind a client-only route, and add cross-origin isolation through request middleware."
    >
      <DocSection id="install" title="Install">
        <p>
          TanStack Start 1.x targets React 19 and Vite 7 or newer. The package itself still supports
          React 18, but use the React version required by your Start release.
        </p>
        <CodeBlock code={installCode} title="terminal" />
      </DocSection>

      <DocSection
        id="client-route"
        title="Render the worker route on the client"
        lede="Use ssr: false for a worker-heavy page, or ssr: 'data-only' to keep loaders on the server while rendering the component in the browser."
      >
        <p>
          The worker is not created during server rendering, but <code>supported</code> is{' '}
          <code>false</code> wherever <code>Worker</code> is absent. Branching visible markup on
          that value during SSR can cause a hydration mismatch, so make the route client-only when
          the widget depends on it.
        </p>
        <CodeBlock code={startRouteCode} title="src/routes/hash.tsx" />
        <Callout tone="tip" title="Selective SSR">
          <p>
            <code>ssr: &apos;data-only&apos;</code> is a good middle ground for a data-driven page:
            route loaders still run on the server, while the worker UI hydrates on the client.
          </p>
        </Callout>
      </DocSection>

      <DocSection
        id="headers"
        title="Add COOP and COEP with request middleware"
        lede="Global request middleware wraps SSR responses, server routes, and server functions."
      >
        <CodeBlock code={startHeadersCode} title="src/start.ts" />
        <p>
          Defining <code>src/start.ts</code> replaces Start&apos;s automatic CSRF middleware for
          server functions, so the snippet keeps it in the chain. If you already have a start file,
          add only the isolation middleware to its <code>requestMiddleware</code> array.
        </p>
        <p>
          Confirm <code>crossOriginIsolated === true</code> in the browser before using shared
          atoms. Prerendered or static assets can bypass server middleware depending on the host, so
          configure the same headers at the CDN or platform layer.
        </p>
      </DocSection>

      <DocSection id="deployment" title="Deployment notes">
        <ul>
          <li>Workers and Blob URLs need a secure context: HTTPS or localhost.</li>
          <li>Keep the CSP directive <code>worker-src blob:</code> if the app uses a CSP.</li>
          <li>Do not serialize server-only data into the worker; pass plain, cloneable props.</li>
          <li>
            Configure COOP/COEP on the Nitro or platform server if the request middleware does not
            cover a response.
          </li>
        </ul>
      </DocSection>

      <div className="doc-next">
        <Link className="button button--primary" to="/docs/frameworks/waku">
          Waku recipe
        </Link>
        <Link className="button" to="/docs/deployment">
          Deployment overview
        </Link>
      </div>
    </DocPage>
  )
}
