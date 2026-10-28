import { Link } from 'react-router-dom'
import { Callout } from '../components/Callout'
import { DocPage, DocSection } from '../components/DocPage'

const platforms = [
  {
    name: 'Vercel',
    headers: 'vercel.json',
    fallback: 'rewrites',
    shared: 'Yes',
    to: '/docs/deployment/vercel',
  },
  {
    name: 'Netlify',
    headers: 'netlify.toml or _headers',
    fallback: 'redirects',
    shared: 'Yes',
    to: '/docs/deployment/netlify',
  },
  {
    name: 'Cloudflare Pages',
    headers: 'public/_headers',
    fallback: '_redirects',
    shared: 'Yes',
    to: '/docs/deployment/cloudflare-pages',
  },
  {
    name: 'GitHub Pages',
    headers: 'Not configurable',
    fallback: '404.html',
    shared: 'No',
    to: '/docs/deployment/github-pages',
  },
] as const

export function DeploymentOverviewPage() {
  return (
    <DocPage
      eyebrow="Deployment"
      title="Deployment overview"
      lede="The library is static-host friendly: there is no server runtime, no worker entry file, and no build plugin. Two things still need attention — cross-origin isolation and client-side routing."
    >
      <DocSection id="requirements" title="What the host must provide">
        <ul>
          <li>
            <strong>A static build.</strong> Vite emits <code>index.html</code> and hashed assets.
            Any host that serves files works.
          </li>
          <li>
            <strong>A secure context.</strong> Web Workers require HTTPS or <code>localhost</code>.
            Every platform here provides HTTPS by default.
          </li>
          <li>
            <strong>SPA fallback.</strong> BrowserRouter deep links need a rewrite to{' '}
            <code>index.html</code>, or a 404 fallback on hosts without rewrites.
          </li>
          <li>
            <strong>COOP and COEP headers.</strong> Required only for{' '}
            <code>SharedArrayBuffer</code> and <code>useSharedAtom</code>. Without them, every other
            feature still works.
          </li>
          <li>
            <strong>CSP allowance.</strong> If the site sends a Content Security Policy, allow{' '}
            <code>worker-src blob:</code>. No <code>unsafe-eval</code> is needed.
          </li>
        </ul>
      </DocSection>

      <DocSection
        id="isolation"
        title="Cross-origin isolation"
        lede="Two headers. One trade-off."
      >
        <p>
          Shared memory requires the document to be cross-origin isolated. Send both headers on the
          document response:
        </p>
        <pre className="code-block code-block--plain">
          <code>{`Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp`}</code>
        </pre>
        <Callout tone="warning" title="COEP is not free">
          <p>
            <code>require-corp</code> blocks cross-origin images, fonts, scripts, and iframes that do
            not opt in with CORP or CORS. Audit third-party embeds and analytics before enabling it
            globally. If you do not need shared atoms, skip these headers.
          </p>
        </Callout>
        <p>
          Verify in the browser console: <code>crossOriginIsolated</code> should be{' '}
          <code>true</code>, and <code>isSharedMemoryAvailable()</code> should return{' '}
          <code>true</code>.
        </p>
      </DocSection>

      <DocSection id="routing" title="Client-side routing">
        <p>
          The demo uses <code>BrowserRouter</code>, React Router&apos;s browser-history router. A
          request for <code>/docs/api</code> must return the app shell, not a platform 404. On
          Vercel, Netlify, and Cloudflare Pages that is a rewrite. On GitHub Pages it is a{' '}
          <code>404.html</code> copy. If the app is served from a subpath, set both the bundler base
          and the router basename.
        </p>
        <Callout tone="note" title="Not every React framework is an SPA">
          <p>
            A blanket rewrite to <code>index.html</code> is correct for this static client-rendered
            demo and other SPAs. It is not the default deployment model for Next.js App Router,
            TanStack Start SSR/Nitro, Waku, or RedwoodSDK. Those frameworks own their server or RSC
            output; use their platform adapter or preset. Only add an SPA fallback when the framework
            is intentionally built in static/SPA mode.
          </p>
        </Callout>
      </DocSection>

      <DocSection id="matrix" title="Platform matrix">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Platform</th>
                <th>Headers</th>
                <th>SPA fallback</th>
                <th>Shared atoms</th>
              </tr>
            </thead>
            <tbody>
              {platforms.map((platform) => (
                <tr key={platform.name}>
                  <td>
                    <Link to={platform.to}>{platform.name}</Link>
                  </td>
                  <td>{platform.headers}</td>
                  <td>{platform.fallback}</td>
                  <td>{platform.shared}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocSection>

      <DocSection id="caching" title="Caching">
        <p>
          Vite fingerprints assets, so <code>/assets/*</code> can be cached immutably. Serve{' '}
          <code>index.html</code> with <code>no-cache</code> so a deploy is visible immediately. If
          you add COOP/COEP, apply them to the document response; asset responses do not need them.
        </p>
      </DocSection>

      <DocSection id="mime" title="MIME types and worker files">
        <p>
          There is no worker file to serve. The runtime and handler are embedded in a Blob URL, so
          the usual <code>worker.js</code> MIME and path problems do not exist. A CSP must still
          permit Blob workers.
        </p>
      </DocSection>

      <div className="doc-next">
        <Link className="button button--primary" to="/docs/deployment/vercel">
          Vercel setup
        </Link>
        <Link className="button" to="/docs/troubleshooting">
          Troubleshooting
        </Link>
      </div>
    </DocPage>
  )
}
