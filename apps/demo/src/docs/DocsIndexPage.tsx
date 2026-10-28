import { Link } from 'react-router-dom'
import { CodeBlock } from '../components/CodeBlock'
import {
  ArrowIcon,
  AtomIcon,
  BookIcon,
  ChevronRightIcon,
  CodeIcon,
  LayersIcon,
  RocketIcon,
  ShieldIcon,
  ThreadIcon,
} from '../components/Icons'
import { Callout } from './components/Callout'
import { DocPage } from './components/DocPage'
import { docGroups } from './nav'
import { firstWorkerCode, installCode } from './snippets'

const primaryLinks = [
  {
    icon: BookIcon,
    title: 'Getting started',
    body: 'Install the package and run a typed worker in a React component.',
    to: '/docs/getting-started',
  },
  {
    icon: ThreadIcon,
    title: 'Core concepts',
    body: 'Execution, serialization, cancellation, transferables, and shared memory.',
    to: '/docs/concepts',
  },
  {
    icon: CodeIcon,
    title: 'API reference',
    body: 'The entire public surface with signatures, options, and error types.',
    to: '/docs/api',
  },
]

const featureLinks = [
  { icon: LayersIcon, label: 'Worker pools', to: '/docs/api#pool' },
  { icon: AtomIcon, label: 'Shared atomics', to: '/docs/api#shared-state' },
  { icon: ShieldIcon, label: 'Retries & plugins', to: '/docs/api#plugins' },
  { icon: RocketIcon, label: 'Deployment', to: '/docs/deployment' },
]

export function DocsIndexPage() {
  return (
    <DocPage
      eyebrow="Documentation"
      title="Everything between npm install and production."
      lede="react-threaded is a typed threading layer for React. These docs cover the execution model, the full API, the framework recipes, and the hosting constraints that actually matter."
    >
      <div className="doc-cards">
        {primaryLinks.map((link) => {
          const Icon = link.icon

          return (
            <Link className="doc-card" key={link.to} to={link.to}>
              <span className="doc-card__icon">
                <Icon width={18} height={18} />
              </span>
              <strong>{link.title}</strong>
              <p>{link.body}</p>
              <span className="doc-card__more">
                Open
                <ChevronRightIcon width={14} height={14} />
              </span>
            </Link>
          )
        })}
      </div>

      <h2 id="install">Install</h2>
      <p>
        React 18 or newer is required. The package ships ESM and CommonJS builds with their own
        declaration files, and has no runtime dependencies.
      </p>
      <CodeBlock code={installCode} title="terminal" />

      <h2 id="first-task">Your first task</h2>
      <p>
        A worker is an ordinary function that returns a value or a promise. The function is
        serialized into a Blob worker, so it must be self-contained: no imports and no closures over
        module state.
      </p>
      <CodeBlock code={firstWorkerCode} title="Fibonacci.tsx" />

      <Callout tone="warning" title="The worker boundary is real">
        <p>
          The handler is copied as source into a separate thread. It cannot see component props,
          module imports, or browser-only objects except those available inside a worker. Pass data
          as arguments.
        </p>
      </Callout>

      <h2 id="browse">Browse by topic</h2>
      <div className="doc-link-grid">
        {docGroups.slice(1).map((group) => (
          <div className="doc-link-group" key={group.title}>
            <span className="doc-link-group__title">{group.title}</span>
            {group.links.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
                <ChevronRightIcon width={13} height={13} />
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="doc-feature-strip">
        {featureLinks.map((link) => {
          const Icon = link.icon

          return (
            <Link key={link.to} to={link.to}>
              <Icon width={16} height={16} />
              {link.label}
            </Link>
          )
        })}
      </div>

      <h2 id="requirements">Requirements</h2>
      <ul>
        <li>React 18 or newer, including React 19.</li>
        <li>A browser with Web Worker and Blob URL support — every current browser qualifies.</li>
        <li>
          Secure context (HTTPS or localhost) for workers. Cross-origin isolation is only required
          for <code>SharedArrayBuffer</code> and shared atoms.
        </li>
        <li>
          No bundler plugin. The same package works with Vite, Next.js, React Router, TanStack Start,
          Astro, Waku, RedwoodSDK, and Gatsby.
        </li>
      </ul>

      <Callout tone="tip" title="Not a service worker">
        <p>
          This package creates dedicated workers for computation. It does not intercept network
          requests, cache assets, or replace a service worker.
        </p>
      </Callout>

      <div className="doc-next">
        <Link className="button button--primary" to="/docs/getting-started">
          Start the quick start
          <ArrowIcon width={16} height={16} />
        </Link>
        <Link className="button" to="/playground">
          Skip to the playground
        </Link>
      </div>
    </DocPage>
  )
}
