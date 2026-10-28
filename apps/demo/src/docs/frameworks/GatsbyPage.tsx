import { Link } from 'react-router-dom'
import { CodeBlock } from '../../components/CodeBlock'
import { Callout } from '../components/Callout'
import { DocPage, DocSection } from '../components/DocPage'
import { installCode } from '../snippets'

const gatsbyPageCode = `// src/pages/hash.tsx
import { useEffect, useState } from 'react'
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

export default function HashPage() {
  const [ready, setReady] = useState(false)
  const worker = useWorker(hash)

  useEffect(() => setReady(true), [])

  return (
    <main>
      <h1>Hash a value</h1>
      <button
        type="button"
        disabled={!ready || !worker.supported || worker.status === 'running'}
        onClick={() => void worker.run('react-threaded')}
      >
        {worker.status === 'running' ? 'Hashing…' : (worker.result ?? 'Hash')}
      </button>
    </main>
  )
}`

const gatsbyDevServerCode = `// gatsby-node.ts
import type { GatsbyNode } from 'gatsby'

export const onCreateDevServer: GatsbyNode['onCreateDevServer'] = ({ app }) => {
  app.use((_req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
    next()
  })
}`

export function GatsbyPage() {
  return (
    <DocPage
      eyebrow="Frameworks"
      title="Gatsby"
      lede="Gatsby renders pages during the build and hydrates them in the browser. Keep browser-only worker UI behind a mounted state, and configure isolation headers at the host."
    >
      <DocSection id="install" title="Install">
        <CodeBlock code={installCode} title="terminal" />
        <p>
          The package works with Gatsby 5 and React 18. No Gatsby plugin, webpack loader, or worker
          entry file is required.
        </p>
      </DocSection>

      <DocSection
        id="page"
        title="Use the hook on a page or component"
        lede="Gatsby builds static HTML in Node, where Worker is undefined."
      >
        <p>
          A mounted state keeps the server-rendered HTML stable. Before hydration, render the
          button in its disabled state; after hydration, the real capability check can take over.
        </p>
        <CodeBlock code={gatsbyPageCode} title="src/pages/hash.tsx" />
        <Callout tone="note" title="No build-time worker">
          <p>
            The worker is created from a Blob URL in the browser. Gatsby&apos;s SSR and build steps
            do not execute the handler, and the page can remain fully static.
          </p>
        </Callout>
      </DocSection>

      <DocSection
        id="development"
        title="Add headers to the development server"
        lede="Gatsby exposes its Express development server through onCreateDevServer."
      >
        <CodeBlock code={gatsbyDevServerCode} title="gatsby-node.ts" />
        <p>
          Restart <code>gatsby develop</code> and verify <code>crossOriginIsolated === true</code>{' '}
          in the browser. This middleware affects only local development.
        </p>
      </DocSection>

      <DocSection
        id="production"
        title="Configure headers where public/ is served"
        lede="Gatsby's build output is static, so the host owns production response headers."
      >
        <p>
          Add COOP and COEP in the platform configuration: <code>vercel.json</code> on Vercel,{' '}
          <code>_headers</code> on Netlify or Cloudflare Pages, or the equivalent response-header
          setting on another host. <code>gatsby serve</code> is a preview and does not configure
          those headers for you.
        </p>
        <Callout tone="tip" title="Without isolation, shared atoms still fall back">
          <p>
            Hard cancellation, worker pools, transferables, and proxies work without COOP/COEP.
            Only <code>SharedArrayBuffer</code> and shared atoms need cross-origin isolation.
          </p>
        </Callout>
      </DocSection>

      <DocSection id="checklist" title="Gatsby checklist">
        <ul>
          <li>Gate <code>worker.supported</code> markup behind a mounted state.</li>
          <li>Keep the handler self-contained; Gatsby imports cannot cross into the worker.</li>
          <li>Use <code>onCreateDevServer</code> for local COOP/COEP headers.</li>
          <li>Configure the same headers on the static host in production.</li>
          <li>Allow <code>blob:</code> workers in the CSP with <code>worker-src blob:</code>.</li>
        </ul>
      </DocSection>

      <div className="doc-next">
        <Link className="button button--primary" to="/docs/deployment/netlify">
          Deploy on Netlify
        </Link>
        <Link className="button" to="/docs/deployment/vercel">
          Deploy on Vercel
        </Link>
      </div>
    </DocPage>
  )
}
