import { Link } from 'react-router-dom'
import { CodeBlock } from '../../components/CodeBlock'
import { Callout } from '../components/Callout'
import { DocPage, DocSection } from '../components/DocPage'
import { installCode, nextClientCode, nextConfigCode } from '../snippets'

export function NextJsPage() {
  return (
    <DocPage
      eyebrow="Frameworks"
      title="Next.js"
      lede="Use react-threaded inside a client component. Server Components cannot own a worker, but they can fetch data and pass serializable props to one."
    >
      <DocSection id="install" title="Install">
        <CodeBlock code={installCode} title="terminal" />
      </DocSection>

      <DocSection
        id="client-boundary"
        title="Put the hook behind 'use client'"
        lede="Workers are a browser capability. A Client Component is the boundary."
      >
        <p>
          The component that calls <code>useWorker</code> or <code>useSharedAtom</code> must start
          with the <code>&apos;use client&apos;</code> directive. The worker definition can live in
          the same file or in a module imported by it.
        </p>
        <CodeBlock code={nextClientCode} title="app/hash-button.tsx" />
        <p>
          A Server Component can render <code>{'<HashButton text={text} />'}</code> and pass
          serializable data. Functions, class instances, and DOM nodes cannot cross that boundary,
          just as they cannot cross a worker boundary.
        </p>
      </DocSection>

      <DocSection
        id="headers"
        title="Enable cross-origin isolation"
        lede="Add headers in next.config.ts so shared atomics work in development and production."
      >
        <CodeBlock code={nextConfigCode} title="next.config.ts" />
        <p>
          Verify with <code>crossOriginIsolated === true</code> in the browser. The headers apply to
          the Next server and to <code>next dev</code>; static exports are served by your host, so
          configure headers there instead.
        </p>
        <Callout tone="note" title="Static export">
          <p>
            <code>output: &apos;export&apos;</code> produces static files and ignores{' '}
            <code>headers()</code>. Shared atomics will fall back to local mode unless the host adds
            COOP and COEP. Hard cancellation, pools, transferables, and proxies are unaffected.
          </p>
        </Callout>
      </DocSection>

      <DocSection id="server-components" title="Keeping server code out of the worker">
        <p>
          The handler is serialized from its source. It cannot import database clients, server-only
          modules, or Node built-ins. Fetch on the server, pass plain data to the Client Component,
          and let the worker transform it.
        </p>
        <CodeBlock
          code={`// app/page.tsx (Server Component)
import { getRows } from '@/lib/db'
import { AggregateTable } from './aggregate-table'

export default async function Page() {
  const rows = await getRows()

  return <AggregateTable rows={rows} />
}

// app/aggregate-table.tsx
'use client'

import { createWorker, useWorker } from 'react-threaded'
import { useEffect } from 'react'

const aggregate = createWorker((rows: readonly Row[]) => {
  return rows.reduce((total, row) => total + row.revenue, 0)
})

export function AggregateTable({ rows }: { readonly rows: readonly Row[] }) {
  const { run, result } = useWorker(aggregate)

  useEffect(() => {
    void run(rows)
  }, [rows, run])

  return <output>{result ?? 'Aggregating…'}</output>
}`}
          title="Server data, client worker"
        />
      </DocSection>

      <DocSection id="rsc" title="React Server Components checklist">
        <ul>
          <li>Mark the component that owns the hook as a Client Component.</li>
          <li>Do not pass functions or React nodes into the worker.</li>
          <li>Keep the handler self-contained; no imports inside the function body.</li>
          <li>
            Use <code>dynamic = &apos;force-dynamic&apos;</code> only if the page needs per-request
            data — the worker does not require it.
          </li>
          <li>Add COOP/COEP at the host if you deploy a static export and need shared memory.</li>
        </ul>
        <Callout tone="tip" title="Turbopack and webpack both work">
          <p>
            No loader configuration is required because the package does not emit a worker entry
            file. The Blob URL is created at runtime.
          </p>
        </Callout>
      </DocSection>

      <div className="doc-next">
        <Link className="button button--primary" to="/docs/frameworks/react-router">
          React Router recipe
        </Link>
        <Link className="button" to="/docs/deployment/vercel">
          Deploy on Vercel
        </Link>
      </div>
    </DocPage>
  )
}
