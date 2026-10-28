import { Link } from 'react-router-dom'
import { CodeBlock } from '../../components/CodeBlock'
import { Callout } from '../components/Callout'
import { DocPage, DocSection } from '../components/DocPage'
import { installCode } from '../snippets'

const redwoodClientCode = `'use client'

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

const redwoodPageCode = `// src/app/pages/HashPage.tsx
import { HashButton } from '../components/HashButton'

export function HashPage() {
  return (
    <main>
      <h1>Hash a value</h1>
      <HashButton />
    </main>
  )
}`

const redwoodWorkerCode = `// src/worker.tsx
import { defineApp } from 'rwsdk/worker'
import { render, route } from 'rwsdk/router'
import { Document } from './app/Document'
import { setCrossOriginIsolation } from './app/headers'
import { HashPage } from './app/pages/HashPage'

export default defineApp([
  setCrossOriginIsolation(),
  render(Document, [route('/hash', HashPage)]),
])`

const redwoodHeadersCode = `// src/app/headers.ts
import type { RouteMiddleware } from 'rwsdk/worker'

export const setCrossOriginIsolation = (): RouteMiddleware => ({ response }) => {
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
}`

export function RedwoodSdkPage() {
  return (
    <DocPage
      eyebrow="Frameworks"
      title="RedwoodSDK"
      lede="RedwoodSDK runs React Server Components on Cloudflare Workers. Put the worker hook in a client component, and set cross-origin isolation on the response."
    >
      <DocSection id="install" title="Install">
        <CodeBlock code={installCode} title="terminal" />
        <p>
          Scaffold or update a RedwoodSDK 1.x app, then add the package to its dependencies. The
          framework runs on the Cloudflare Workers runtime; the worker itself still runs in the
          visitor&apos;s browser.
        </p>
      </DocSection>

      <DocSection
        id="client-boundary"
        title="Mark the worker component as a client component"
        lede="Components are Server Components unless they opt into client hydration."
      >
        <CodeBlock code={redwoodClientCode} title="src/app/components/HashButton.tsx" />
        <CodeBlock code={redwoodPageCode} title="src/app/pages/HashPage.tsx" />
        <p>
          Import the client component into a page and register that page in <code>defineApp</code>.
          The server renders the page shell; the button becomes interactive after hydration.
        </p>
        <CodeBlock code={redwoodWorkerCode} title="src/worker.tsx" />
      </DocSection>

      <DocSection
        id="headers"
        title="Set COOP and COEP in middleware"
        lede="RedwoodSDK exposes a mutable response object to route middleware."
      >
        <CodeBlock code={redwoodHeadersCode} title="src/app/headers.ts" />
        <p>
          Register the middleware before the rendered routes so every document response receives
          the headers. Add them to the existing security middleware if the app already sets a CSP.
        </p>
        <Callout tone="note" title="CSP needs blob workers">
          <p>
            If you set <code>Content-Security-Policy</code>, include{' '}
            <code>worker-src blob:</code> (or a <code>worker-src</code> directive that permits{' '}
            <code>blob:</code>). The worker is created from a Blob URL at runtime.
          </p>
        </Callout>
      </DocSection>

      <DocSection id="hydration" title="Hydration and browser-only values">
        <p>
          Client components are server-rendered by default, so <code>worker.supported</code> is{' '}
          <code>false</code> during SSR and <code>true</code> after hydration in a modern browser.
          If visible markup depends on it, gate that markup behind a mounted state.
        </p>
        <CodeBlock
          code={`'use client'

import { useEffect, useState } from 'react'
import { createWorker, useWorker } from 'react-threaded'

const work = createWorker((value: number) => value * 2)

export function WorkerPanel() {
  const [ready, setReady] = useState(false)
  const worker = useWorker(work)

  useEffect(() => setReady(true), [])

  return (
    <button
      type="button"
      disabled={!ready || !worker.supported || worker.status === 'running'}
      onClick={() => void worker.run(21)}
    >
      {worker.result ?? 'Compute'}
    </button>
  )
}`}
          title="A stable SSR fallback"
        />
        <p>
          Alternatively, disable SSR for a client-only route group with{' '}
          <code>{'render(Document, routes, { ssr: false })'}</code>. Keep the RSC payload enabled
          when using that option.
        </p>
      </DocSection>

      <DocSection id="checklist" title="RedwoodSDK checklist">
        <ul>
          <li>Keep hooks in files marked <code>&apos;use client&apos;</code>.</li>
          <li>Pass serializable data from Server Components into the client component.</li>
          <li>Add COOP/COEP before the route group for shared atoms.</li>
          <li>Allow <code>blob:</code> workers in the CSP.</li>
          <li>Use a mounted gate for markup that depends on browser capabilities.</li>
        </ul>
      </DocSection>

      <div className="doc-next">
        <Link className="button button--primary" to="/docs/frameworks/gatsby">
          Gatsby recipe
        </Link>
        <Link className="button" to="/docs/deployment/cloudflare-pages">
          Deploy on Cloudflare
        </Link>
      </div>
    </DocPage>
  )
}
