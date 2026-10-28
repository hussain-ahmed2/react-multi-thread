import { Link } from 'react-router-dom'
import { CodeBlock } from '../../components/CodeBlock'
import { Callout } from '../components/Callout'
import { DocPage, DocSection } from '../components/DocPage'
import { installCode, viteHeadersCode } from '../snippets'

const routeCode = `import { createWorker, useWorker } from 'react-threaded'

const parse = createWorker((text: string) => {
  return text.split('\\n').filter(Boolean).length
})

export function ParseRoute() {
  const worker = useWorker(parse)

  return (
    <section>
      <h1>Line counter</h1>
      <button onClick={() => void worker.run(source)}>Count</button>
      <output>{worker.result ?? '—'}</output>
    </section>
  )
}`

const basenameCode = `import { BrowserRouter } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <App />
  </BrowserRouter>,
)`

export function ReactRouterPage() {
  return (
    <DocPage
      eyebrow="Frameworks"
      title="React Router"
      lede="Use the hooks inside a route component. BrowserRouter, RouterProvider, and framework mode all work; only the routing setup differs."
    >
      <DocSection id="install" title="Install">
        <CodeBlock code={installCode} title="terminal" />
        <p>
          The package does not couple to the router. A route component is just a component, so the
          worker lifecycles follow the route: mounting creates, navigating away disposes.
        </p>
      </DocSection>

      <DocSection id="spa" title="SPA data mode">
        <CodeBlock code={routeCode} title="src/routes/parse.tsx" />
        <p>
          Register the component in your route table. With <code>createBrowserRouter</code>, the
          component unmounts when the route changes and the worker is terminated automatically.
        </p>
        <CodeBlock
          code={`const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'parse', element: <ParseRoute /> },
    ],
  },
])`}
          title="router.tsx"
        />
      </DocSection>

      <DocSection
        id="headers"
        title="Cross-origin isolation"
        lede="The Vite setup is identical to any other React SPA."
      >
        <CodeBlock code={viteHeadersCode} title="vite.config.ts" />
        <p>
          In production, the host must send COOP and COEP. A client-side router does not change that
          requirement.
        </p>
      </DocSection>

      <DocSection id="framework-mode" title="Framework mode and Remix">
        <p>
          In React Router framework mode, route modules render on the server and hydrate on the
          client. Keep the worker component behind a client boundary. The route module can load data
          on the server and pass serializable props into the client component.
        </p>
        <Callout tone="note" title="Hydration is not a worker boundary">
          <p>
            A worker starts during hydration. Server rendering cannot create one. If a component
            must not render on the server, use your framework&apos;s client-only boundary or a
            mounted flag; the hooks already handle an unsupported environment gracefully.
          </p>
        </Callout>
        <p>
          For Remix-style deployments, use the adapter&apos;s header configuration to add COOP/COEP
          globally or only on routes that need shared memory.
        </p>
      </DocSection>

      <DocSection id="fallback" title="SPA fallbacks and subpaths">
        <p>
          A BrowserRouter deployment needs a rewrite to <code>index.html</code> so deep links do not
          404. If the app lives under a subpath, set the basename and the bundler base together:
        </p>
        <CodeBlock code={basenameCode} title="main.tsx" />
        <p>
          On hosts that cannot set headers or rewrites, such as GitHub Pages, use the 404 fallback
          and consider <code>HashRouter</code>. The GitHub Pages guide covers the trade-offs.
        </p>
      </DocSection>

      <div className="doc-next">
        <Link className="button button--primary" to="/docs/frameworks/astro">
          Astro recipe
        </Link>
        <Link className="button" to="/docs/deployment">
          Deployment overview
        </Link>
      </div>
    </DocPage>
  )
}
