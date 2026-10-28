import { Link } from 'react-router-dom'
import { CodeBlock } from '../../components/CodeBlock'
import { Callout } from '../components/Callout'
import { DocPage, DocSection } from '../components/DocPage'
import {
  netlifyConfigCode,
  nextNetlifyConfigCode,
  nextNetlifyHeadersCode,
} from '../snippets'

export function NetlifyPage() {
  return (
    <DocPage
      eyebrow="Deployment"
      title="Netlify"
      lede="Netlify has two very different modes for React: a server adapter for frameworks such as Next.js, and a static publish directory for a Vite SPA. Pick the mode before copying any redirect."
    >
      <DocSection id="nextjs" title="Next.js on Netlify" lede="The common production path.">
        <p>
          Netlify detects Next.js and installs its current OpenNext adapter automatically. Publish
          the framework output in <code>.next</code>. Do not add a <code>/*</code> redirect to{' '}
          <code>/index.html</code>, and do not hard-code an older adapter plugin version.
        </p>
        <CodeBlock code={nextNetlifyConfigCode} title="netlify.toml" />
        <CodeBlock code={nextNetlifyHeadersCode} title="next.config.ts" />
        <p>
          Keeping isolation headers in <code>next.config.ts</code> means <code>next dev</code>, the
          Netlify runtime, and other Next.js hosts share one definition. If you move the headers to{' '}
          <code>[[headers]]</code> in <code>netlify.toml</code>, remove the{' '}
          <code>headers()</code> block instead of duplicating it.
        </p>
        <Callout tone="warning" title="Do not use the static SPA recipe for Next.js">
          <p>
            A catch-all rewrite bypasses App Router route handlers and server rendering. It also
            does not create the server functions Next.js needs. Next.js on Netlify is a server
            deployment, not a static SPA deployment.
          </p>
        </Callout>
        <Callout tone="note" title="Monorepo">
          <p>
            If the app is not at the repository root, add <code>base = &quot;apps/web&quot;</code>{' '}
            under <code>[build]</code> and keep <code>publish = &quot;.next&quot;</code> relative to
            that base.
          </p>
        </Callout>
        <p>
          For Cloudflare and GitHub Pages variants, see{' '}
          <Link to="/docs/deployment/recipes#nextjs">the Next.js deployment recipes</Link>.
        </p>
      </DocSection>

      <DocSection id="config" title="Static SPA on Netlify">
        <p>
          Use this mode only for a client-rendered Vite app. The redirect is what lets{' '}
          <code>BrowserRouter</code> handle a hard refresh on a deep link.
        </p>
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
