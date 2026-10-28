import { Link } from 'react-router-dom'
import { CodeBlock } from '../../components/CodeBlock'
import { Callout } from '../components/Callout'
import { DocPage, DocSection } from '../components/DocPage'
import { installCode } from '../snippets'

const wakuClientCode = `'use client'

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

export function HashButton() {
  const worker = useWorker(hash)

  return (
    <button type="button" onClick={() => void worker.run('react-threaded')}>
      {worker.status === 'running' ? 'Hashing…' : (worker.result ?? 'Hash')}
    </button>
  )
}`

const wakuPageCode = `// src/pages/hash.tsx
import { HashButton } from '../components/hash-button'

export default function HashPage() {
  return (
    <main>
      <h1>Hash a value</h1>
      <HashButton />
    </main>
  )
}`

const wakuHeadersCode = `// src/middleware/cross-origin-isolation.ts
import type { MiddlewareHandler } from 'hono'

const crossOriginIsolation = (): MiddlewareHandler => {
  return async (c, next) => {
    await next()
    c.header('Cross-Origin-Opener-Policy', 'same-origin')
    c.header('Cross-Origin-Embedder-Policy', 'require-corp')
  }
}

export default crossOriginIsolation`

export function WakuPage() {
  return (
    <DocPage
      eyebrow="Frameworks"
      title="Waku"
      lede="Waku builds around React Server Components and file-based routes. Keep the worker behind a 'use client' boundary, then let the page stream from the server."
    >
      <DocSection id="install" title="Install">
        <CodeBlock code={installCode} title="terminal" />
      </DocSection>

      <DocSection
        id="client-boundary"
        title="Put the hook in a client component"
        lede="Waku pages are Server Components by default. Hooks and browser APIs belong on the other side of a client boundary."
      >
        <p>
          Create a component with the <code>&apos;use client&apos;</code> directive and import it
          into a page under <code>src/pages</code>. The page can stay a Server Component and still
          render the interactive worker button.
        </p>
        <CodeBlock code={wakuClientCode} title="src/components/hash-button.tsx" />
        <CodeBlock code={wakuPageCode} title="src/pages/hash.tsx" />
        <Callout tone="note" title="Pages are prerendered by default">
          <p>
            A static page is rendered at build time, but the worker is only created in the browser
            after hydration. Rendering the page statically does not start a worker during the build.
          </p>
        </Callout>
      </DocSection>

      <DocSection
        id="headers"
        title="Set headers with Hono middleware"
        lede="Waku loads files in src/middleware as Hono middleware in the default setup."
      >
        <CodeBlock code={wakuHeadersCode} title="src/middleware/cross-origin-isolation.ts" />
        <p>
          These headers make <code>SharedArrayBuffer</code> available for shared atoms. Hard
          cancellation, pools, transferables, and proxies work without cross-origin isolation.
        </p>
        <Callout tone="warning" title="Static pages can bypass middleware">
          <p>
            Waku serves prerendered pages before middleware runs in production. Add the same
            COOP/COEP headers through the host as well — for example a Netlify or Cloudflare{' '}
            <code>_headers</code> file, or the platform&apos;s response-header configuration.
          </p>
        </Callout>
      </DocSection>

      <DocSection id="server-components" title="Keep server data on the server">
        <p>
          Fetch in the Server Component, then pass serializable values to the client component. A
          worker function is copied into a Blob worker and cannot import your server modules, access
          cookies, or close over request-scoped values.
        </p>
        <CodeBlock
          code={`// src/pages/report.tsx
import { ReportTable } from '../components/report-table'

export default async function ReportPage() {
  const rows = await getRows()

  return (
    <main>
      <h1>Report</h1>
      <ReportTable rows={rows} />
    </main>
  )
}`}
          title="Server data, client worker"
        />
      </DocSection>

      <DocSection id="checklist" title="Waku checklist">
        <ul>
          <li>Keep the hook inside a module marked <code>&apos;use client&apos;</code>.</li>
          <li>Pass plain objects, arrays, numbers, and strings across the RSC boundary.</li>
          <li>Add COOP/COEP at the host for prerendered pages that use shared atoms.</li>
          <li>Add <code>worker-src blob:</code> to the CSP if one is enabled.</li>
        </ul>
      </DocSection>

      <div className="doc-next">
        <Link className="button button--primary" to="/docs/frameworks/redwood-sdk">
          RedwoodSDK recipe
        </Link>
        <Link className="button" to="/docs/frameworks/astro">
          Astro recipe
        </Link>
      </div>
    </DocPage>
  )
}
