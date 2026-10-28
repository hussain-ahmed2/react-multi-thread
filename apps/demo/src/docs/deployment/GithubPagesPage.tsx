import { Link } from 'react-router-dom'
import { CodeBlock } from '../../components/CodeBlock'
import { Callout } from '../components/Callout'
import { DocPage, DocSection } from '../components/DocPage'
import { githubWorkflowCode } from '../snippets'

export function GithubPagesPage() {
  return (
    <DocPage
      eyebrow="Deployment"
      title="GitHub Pages"
      lede="Pages is static-only and does not let you set response headers. That means no SharedArrayBuffer. Every other feature — workers, pools, transferables, cancellation — works."
    >
      <DocSection id="base-path" title="Set the base path">
        <p>
          Project Pages are served from <code>/&lt;repository&gt;/</code>. Build with a matching
          base and router basename. This demo reads <code>DEMO_BASE</code> at build time:
        </p>
        <CodeBlock
          code={`DEMO_BASE=/react-threaded/ pnpm build:demo`}
          title="terminal"
        />
        <p>
          The Vite config passes the value to <code>base</code>, and the app derives the router
          basename from <code>import.meta.env.BASE_URL</code>. Use <code>/</code> when deploying to a
          user or organization root site, or when a custom domain is attached.
        </p>
      </DocSection>

      <DocSection id="fallback" title="Deep links need a 404 fallback">
        <p>
          Pages serves <code>404.html</code> for unknown paths. Copy the built shell there so a deep
          link boots the SPA instead of showing GitHub&apos;s 404 page:
        </p>
        <CodeBlock
          code={`cp apps/demo/dist/index.html apps/demo/dist/404.html`}
          title="post-build"
        />
        <p>
          BrowserRouter then reads the original URL. Because the build used the repository base, the
          asset URLs still resolve from the 404 page.
        </p>
      </DocSection>

      <DocSection id="workflow" title="GitHub Actions workflow">
        <CodeBlock code={githubWorkflowCode} title=".github/workflows/deploy-pages.yml" />
        <p>
          This repository uses that workflow and publishes the demo at{' '}
          <a href="https://hussain-ahmed2.github.io/react-threaded/">
            hussain-ahmed2.github.io/react-threaded
          </a>
          . Enable Pages with <strong>GitHub Actions</strong> as the source before the first deploy.
          The workflow installs the workspace, verifies the library and demo, builds with the
          repository base, creates the 404 fallback, and publishes the artifact.
        </p>
      </DocSection>

      <DocSection id="shared-memory" title="Shared atoms on Pages">
        <Callout tone="warning" title="No custom headers means no SharedArrayBuffer">
          <p>
            GitHub Pages does not support COOP/COEP. <code>crossOriginIsolated</code> stays false,
            so <code>createSharedAtom</code> uses its local fallback. The shared-atomics demo will
            explain that the buffer is unavailable; the rest of the playground still works.
          </p>
        </Callout>
        <p>
          If shared memory is a requirement, deploy to Vercel, Netlify, or Cloudflare Pages, or put
          a CDN with header support in front of Pages. A <code>HashRouter</code> is an alternative
          for routing, but it does not change the header limitation.
        </p>
      </DocSection>

      <DocSection id="hash-router" title="HashRouter alternative">
        <p>
          If you cannot create a 404 fallback, use <code>HashRouter</code>. URLs become{' '}
          <code>/#/docs/api</code>, which Pages always resolves to <code>index.html</code>. Links and
          navigation work without a server rewrite; only the visible URL shape changes.
        </p>
        <CodeBlock
          code={`import { HashRouter } from 'react-router-dom'

createRoot(document.getElementById('root')!).render(
  <HashRouter basename={import.meta.env.BASE_URL}>
    <App />
  </HashRouter>,
)`}
          title="main.tsx"
        />
      </DocSection>

      <div className="doc-next">
        <Link className="button button--primary" to="/docs/troubleshooting">
          Troubleshooting
        </Link>
        <Link className="button" to="/docs/deployment">
          Back to overview
        </Link>
      </div>
    </DocPage>
  )
}
