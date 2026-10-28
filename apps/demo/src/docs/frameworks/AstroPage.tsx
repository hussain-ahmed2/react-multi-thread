import { Link } from 'react-router-dom'
import { CodeBlock } from '../../components/CodeBlock'
import { Callout } from '../components/Callout'
import { DocPage, DocSection } from '../components/DocPage'
import { astroConfigCode, astroIslandCode, installCode } from '../snippets'

const islandCode = `import { createWorker, useWorker } from 'react-threaded'

const hash = createWorker(async (text: string) => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  )
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
})

export function HashButton({ text }: { readonly text: string }) {
  const worker = useWorker(hash)
  return (
    <button onClick={() => void worker.run(text)}>
      {worker.result ?? 'Hash'}
    </button>
  )
}`

export function AstroPage() {
  return (
    <DocPage
      eyebrow="Frameworks"
      title="Astro"
      lede="Astro ships HTML by default. Add the React integration, then mount the worker component as a client island so it hydrates in the browser."
    >
      <DocSection id="install" title="Install">
        <CodeBlock
          code={`pnpm add react-threaded @astrojs/react
# react and react-dom are peer dependencies`}
          title="terminal"
        />
        <CodeBlock code={installCode} title="terminal" />
      </DocSection>

      <DocSection id="island" title="Create the island">
        <p>
          The component uses React hooks, so it needs a client directive. <code>client:load</code>{' '}
          hydrates immediately; <code>client:visible</code> waits until it scrolls into view.
        </p>
        <CodeBlock code={islandCode} title="src/components/HashButton.tsx" />
        <CodeBlock code={astroIslandCode} title="src/pages/index.astro" />
        <Callout tone="tip" title="Use client:only for worker-only widgets">
          <p>
            If the component has no meaningful server-rendered fallback,{' '}
            <code>client:only=&quot;react&quot;</code> skips SSR entirely. That is the simplest way
            to avoid a hydration mismatch for a canvas or worker-heavy widget.
          </p>
        </Callout>
      </DocSection>

      <DocSection id="headers" title="Headers and shared memory">
        <p>
          Add the React integration and COOP/COEP headers to the Vite server Astro uses internally:
        </p>
        <CodeBlock code={astroConfigCode} title="astro.config.mjs" />
        <p>
          Static output is served by your host, which must add the same headers in production. The
          deployment guides show the exact files.
        </p>
      </DocSection>

      <DocSection id="output" title="Static output">
        <p>
          Workers are created at runtime from a Blob URL, so Astro&apos;s static build needs no
          special adapter. If the island is the only interactive part of the page, the rest of the
          document remains plain HTML and CSS.
        </p>
        <ul>
          <li>Set the React integration in the Astro config.</li>
          <li>Give the worker component a client directive.</li>
          <li>Configure COOP/COEP at the host if you use shared atoms.</li>
          <li>Add the CSP <code>worker-src blob:</code> directive if the site has a CSP.</li>
        </ul>
      </DocSection>

      <div className="doc-next">
        <Link className="button button--primary" to="/docs/deployment">
          Deployment overview
        </Link>
        <Link className="button" to="/docs/deployment/github-pages">
          Deploy on GitHub Pages
        </Link>
      </div>
    </DocPage>
  )
}
