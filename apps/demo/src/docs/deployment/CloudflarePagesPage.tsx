import { Link } from 'react-router-dom'
import { CodeBlock } from '../../components/CodeBlock'
import { Callout } from '../components/Callout'
import { DocPage, DocSection } from '../components/DocPage'
import { cloudflareHeadersCode } from '../snippets'

export function CloudflarePagesPage() {
  return (
    <DocPage
      eyebrow="Deployment"
      title="Cloudflare Pages"
      lede="This page covers the static Vite build on Pages. Cloudflare also runs Next.js, React Router, Astro, TanStack Start, Waku, and RedwoodSDK through Workers or Pages adapters; those need their own server configuration."
    >
      <DocSection id="frameworks" title="Framework deployments">
        <p>
          Keep <code>_headers</code> and <code>_redirects</code> for the static Vite build only. For
          Next.js, use the OpenNext adapter (or vinext for new projects); React Router and TanStack
          Start use the Cloudflare Vite plugin; Astro uses <code>@astrojs/cloudflare</code>; Waku and
          RedwoodSDK deploy as Workers. See the{' '}
          <Link to="/docs/deployment/recipes">framework deployment recipes</Link>.
        </p>
      </DocSection>

      <DocSection id="build" title="Static Vite build settings">
        <ul>
          <li>Framework preset: Vite.</li>
          <li>
            Build command: <code>pnpm build:demo</code>.
          </li>
          <li>
            Build output directory: <code>apps/demo/dist</code>.
          </li>
          <li>Root directory: repository root.</li>
        </ul>
        <p>
          Pages installs dependencies from the workspace lockfile. If the build cannot find pnpm,
          set the package manager in the project settings or add a Corepack step.
        </p>
      </DocSection>

      <DocSection id="headers" title="Headers">
        <p>
          Pages reads <code>_headers</code> from the output directory. Place it in{' '}
          <code>public/</code> so Vite copies it into <code>dist/</code>:
        </p>
        <CodeBlock code={cloudflareHeadersCode} title="apps/demo/public/_headers" />
        <p>
          The file is plain text: one rule block per path pattern, one header per line. Static assets
          inherit the document headers only if they match the pattern; that is harmless.
        </p>
      </DocSection>

      <DocSection id="routing" title="SPA routing">
        <p>
          Add a <code>_redirects</code> file for deep links:
        </p>
        <CodeBlock
          code={`# apps/demo/public/_redirects
/*  /index.html  200`}
          title="apps/demo/public/_redirects"
        />
        <Callout tone="note" title="Assets win over redirects">
          <p>
            Pages serves an existing file before applying the fallback. A request for a real asset
            still returns that asset; only unknown paths reach <code>index.html</code>.
          </p>
        </Callout>
        <p>
          If the site is hosted under a subpath, set Vite&apos;s <code>base</code> and the router
          basename. The build must use the same path Pages serves.
        </p>
      </DocSection>

      <DocSection id="isolation" title="Cross-origin isolation trade-off">
        <p>
          The header block enables shared atomics for the entire site. That is acceptable for this
          demo, which loads no third-party embeds. In a content site, consider applying COOP/COEP
          only to the playground route, or skip shared atoms.
        </p>
        <p>
          Check <code>crossOriginIsolated</code> in production. If it is false, the atom falls back
          to local mode and the UI explains that the buffer is unavailable.
        </p>
      </DocSection>

      <DocSection id="verify" title="Verify the deploy">
        <ol>
          <li>Request a deep link directly and reload it.</li>
          <li>Inspect the document response for COOP and COEP.</li>
          <li>Confirm <code>_headers</code> was copied into the deployed output.</li>
          <li>Run the shared-atomics demo and check for the SharedArrayBuffer badge.</li>
        </ol>
      </DocSection>

      <div className="doc-next">
        <Link className="button button--primary" to="/docs/deployment/github-pages">
          GitHub Pages setup
        </Link>
        <Link className="button" to="/docs/deployment">
          Back to overview
        </Link>
      </div>
    </DocPage>
  )
}
