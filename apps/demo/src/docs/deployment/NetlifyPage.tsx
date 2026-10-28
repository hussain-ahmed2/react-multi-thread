import { Link } from 'react-router-dom'
import { CodeBlock } from '../../components/CodeBlock'
import { Callout } from '../components/Callout'
import { DocPage, DocSection } from '../components/DocPage'
import { netlifyConfigCode } from '../snippets'

export function NetlifyPage() {
  return (
    <DocPage
      eyebrow="Deployment"
      title="Netlify"
      lede="Use netlify.toml for the build, headers, and SPA redirect in one reviewable file. No functions are required."
    >
      <DocSection id="config" title="netlify.toml">
        <CodeBlock code={netlifyConfigCode} title="netlify.toml" />
        <p>
          The redirect sends unknown paths to <code>index.html</code> with a 200 status, so
          BrowserRouter can take over. The header block enables cross-origin isolation for the whole
          site.
        </p>
        <Callout tone="note" title="This redirect is for the static SPA demo">
          <p>
            <code>BrowserRouter</code> is React Router&apos;s browser-history router, used by this
            Vite demo. The fallback is not a Netlify requirement for every React framework. Next.js
            on Netlify uses its Next adapter and must not be rewritten blindly to{' '}
            <code>index.html</code>. TanStack Start runs through its Nitro/server target unless you
            deliberately build SPA mode. Waku and RedwoodSDK use server rendering and need their own
            runtime adapters.
          </p>
        </Callout>
      </DocSection>

      <DocSection id="build" title="Build settings">
        <ul>
          <li>Base directory: repository root.</li>
          <li>
            Build command: <code>pnpm build:demo</code>.
          </li>
          <li>
            Publish directory: <code>apps/demo/dist</code>.
          </li>
          <li>
            Dependency install: Netlify reads <code>pnpm-lock.yaml</code> and uses pnpm.
          </li>
        </ul>
        <p>
          If the demo is extracted into its own repository, use <code>pnpm build</code> and{' '}
          <code>dist</code> instead.
        </p>
      </DocSection>

      <DocSection id="alternatives" title="_headers and _redirects">
        <p>
          Netlify also reads plain files from the publish directory. They are useful when the build
          output is generated from a different root:
        </p>
        <CodeBlock
          code={`# apps/demo/public/_headers
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp

# apps/demo/public/_redirects
/*  /index.html  200`}
          title="Plain files"
        />
        <Callout tone="note" title="Do not duplicate rules">
          <p>
            If both <code>netlify.toml</code> and <code>_headers</code> define the same header,
            Netlify merges them. Pick one source of truth to avoid drift between environments.
          </p>
        </Callout>
      </DocSection>

      <DocSection id="verify" title="Verify the deploy">
        <ol>
          <li>Reload a deep link such as <code>/docs/api</code>.</li>
          <li>Confirm both COOP and COEP appear on the document response.</li>
          <li>Check <code>crossOriginIsolated</code> and the shared-atomics demo.</li>
          <li>Confirm hashed assets are cached and the HTML is revalidated.</li>
        </ol>
      </DocSection>

      <div className="doc-next">
        <Link className="button button--primary" to="/docs/deployment/cloudflare-pages">
          Cloudflare Pages setup
        </Link>
        <Link className="button" to="/docs/deployment">
          Back to overview
        </Link>
      </div>
    </DocPage>
  )
}
