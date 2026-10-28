import { Link } from 'react-router-dom'
import { CodeBlock } from '../../components/CodeBlock'
import { Callout } from '../components/Callout'
import { DocPage, DocSection } from '../components/DocPage'
import { vercelConfigCode } from '../snippets'

export function VercelPage() {
  return (
    <DocPage
      eyebrow="Deployment"
      title="Vercel"
      lede="This page covers the static Vite demo. Vercel also runs Next.js natively and has presets for React Router and Nitro-based TanStack Start; those must not reuse the SPA rewrite below."
    >
      <DocSection id="frameworks" title="Next.js and other frameworks">
        <p>
          Vercel is the native runtime for Next.js. Keep COOP/COEP in <code>next.config.ts</code>{' '}
          <code>headers()</code> and do not add a catch-all rewrite. React Router framework mode
          uses <code>@vercel/react-router</code>; TanStack Start deploys its Nitro output. See the{' '}
          <Link to="/docs/deployment/recipes">framework deployment recipes</Link> for exact files.
        </p>
      </DocSection>

      <DocSection id="project" title="Static Vite project settings">
        <ul>
          <li>Framework preset: Vite.</li>
          <li>Root directory: the repository root (the demo lives in a pnpm workspace).</li>
          <li>
            Build command: <code>pnpm build:demo</code>.
          </li>
          <li>
            Output directory: <code>apps/demo/dist</code>.
          </li>
          <li>
            Install command: <code>pnpm install --frozen-lockfile</code>.
          </li>
        </ul>
        <p>
          If you deploy only the demo folder, adjust the paths and run <code>pnpm build</code> from
          that package instead.
        </p>
      </DocSection>

      <DocSection
        id="config"
        title="Headers and SPA rewrite"
        lede="Put both in vercel.json at the project root."
      >
        <CodeBlock code={vercelConfigCode} title="vercel.json" />
        <p>
          The headers apply to every response. That is the simplest way to keep the document and
          its assets consistent. The rewrite sends unknown paths to the app shell so BrowserRouter
          can resolve them.
        </p>
        <Callout tone="warning" title="Apply headers to the document">
          <p>
            COOP and COEP only matter on the HTML document. If you scope the header rule to{' '}
            <code>/</code>, deep links served through the rewrite may not be isolated. Use{' '}
            <code>/(.*)</code> or a rule that covers the document paths you serve.
          </p>
        </Callout>
      </DocSection>

      <DocSection id="verify" title="Verify the deploy">
        <ol>
          <li>Open the production URL and check the Network panel for both headers on the document.</li>
          <li>
            In the console, run{' '}
            <code>{`({ isolated: crossOriginIsolated, sab: typeof SharedArrayBuffer })`}</code>.
          </li>
          <li>Open a deep link directly, then reload it. It should render, not 404.</li>
          <li>Run the shared-atomics demo. The badge should say SharedArrayBuffer.</li>
        </ol>
        <Callout tone="note" title="Without shared atoms">
          <p>
            If you only use hooks, pools, proxies, and transferables, delete the header block. Skip
            the COEP trade-off until you actually need shared memory.
          </p>
        </Callout>
      </DocSection>

      <DocSection id="caching" title="Caching">
        <p>
          Vercel serves fingerprinted assets with long-lived caching by default. Keep{' '}
          <code>index.html</code> uncached so a new deployment is picked up immediately. The
          rewrite already returns the latest shell.
        </p>
      </DocSection>

      <div className="doc-next">
        <Link className="button button--primary" to="/docs/deployment/netlify">
          Netlify setup
        </Link>
        <Link className="button" to="/docs/deployment">
          Back to overview
        </Link>
      </div>
    </DocPage>
  )
}
