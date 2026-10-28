import { Link } from 'react-router-dom'
import { CodeBlock } from '../components/CodeBlock'
import {
  ArrowIcon,
  AtomIcon,
  BoltIcon,
  BookIcon,
  ChevronRightIcon,
  CodeIcon,
  GaugeIcon,
  GithubIcon,
  LayersIcon,
  PackageIcon,
  RocketIcon,
  ShieldIcon,
  TerminalIcon,
  ThreadIcon,
} from '../components/Icons'
import type { IconProps } from '../components/Icons'

const repositoryUrl = 'https://github.com/hussain-ahmed2/react-threaded'

const heroCode = `import { createWorker, useWorker } from 'react-threaded'

const fibonacci = createWorker((n: number) => {
  let a = 0n
  let b = 1n
  for (let i = 0; i < n; i += 1) [a, b] = [b, a + b]
  return a.toString()
})

export function Fibonacci() {
  const worker = useWorker(fibonacci)

  return (
    <button onClick={() => worker.run(100_000)}>
      {worker.status === 'running' ? 'Computing…' : 'Compute'}
    </button>
  )
}`

const features: readonly {
  readonly icon: (props: IconProps) => JSX.Element
  readonly title: string
  readonly body: string
}[] = [
  {
    icon: ThreadIcon,
    title: 'Types travel with the task',
    body: 'The function is the contract. Inputs, outputs, progress, and proxy methods are inferred from the code you already wrote. No message unions to maintain.',
  },
  {
    icon: GaugeIcon,
    title: 'Cancellation that lands',
    body: 'Terminate a synchronous loop and respawn the worker, or cancel cooperatively through SharedArrayBuffer and ctx.yield(). Late results can never overwrite newer state.',
  },
  {
    icon: LayersIcon,
    title: 'Pools and promise APIs',
    body: 'Run bounded concurrency with a worker pool, or expose methods as typed async functions. Both share retries, plugins, and transferable ownership.',
  },
  {
    icon: AtomIcon,
    title: 'Shared memory, reactively',
    body: 'A signed 32-bit atom over SharedArrayBuffer and Atomics, with polling, cross-tab BroadcastChannel updates, and a local fallback when isolation is unavailable.',
  },
  {
    icon: ShieldIcon,
    title: 'Observable by default',
    body: 'Attach logging, timing, metrics, or tracing plugins. Every lifecycle event is typed, and a failing plugin can never break a task.',
  },
  {
    icon: BoltIcon,
    title: 'Built on the platform',
    body: 'Blob workers, structured clone, transferables, AbortSignal, and React external stores. No eval, no hidden runtime, no dependency tree.',
  },
]

const stats = [
  { value: '0', label: 'runtime dependencies' },
  { value: '40', label: 'tests passing' },
  { value: 'ESM + CJS', label: 'dual build' },
  { value: 'Strict', label: 'TypeScript' },
]

const steps = [
  {
    number: '01',
    title: 'Write a self-contained function',
    body: 'Anything the worker can run on its own works: a sieve, a parser, a hash, image processing, or a simulation.',
  },
  {
    number: '02',
    title: 'Call it through a hook',
    body: 'useWorker returns result, progress, error, status, and a cancel function. createWorkerProxy turns methods into async calls.',
  },
  {
    number: '03',
    title: 'Deploy anywhere React runs',
    body: 'Vite, Next.js, React Router, TanStack Start, Astro, Waku, RedwoodSDK, and Gatsby all work. Headers enable shared memory; hard cancellation needs no special hosting.',
  },
]

const frameworks = [
  { label: 'React + Vite', to: '/docs/frameworks/vite', note: 'Reference setup' },
  { label: 'Next.js', to: '/docs/frameworks/nextjs', note: 'App Router' },
  { label: 'React Router', to: '/docs/frameworks/react-router', note: 'SPA + framework mode' },
  { label: 'TanStack Start', to: '/docs/frameworks/tanstack-start', note: 'Selective SSR' },
  { label: 'Astro', to: '/docs/frameworks/astro', note: 'React islands' },
  { label: 'Waku', to: '/docs/frameworks/waku', note: 'Server Components' },
  { label: 'RedwoodSDK', to: '/docs/frameworks/redwood-sdk', note: 'Cloudflare RSC' },
  { label: 'Gatsby', to: '/docs/frameworks/gatsby', note: 'Static sites' },
]

const docsLinks = [
  {
    icon: BookIcon,
    title: 'Getting started',
    body: 'Install, define a worker, and render its result in under five minutes.',
    to: '/docs/getting-started',
  },
  {
    icon: CodeIcon,
    title: 'API reference',
    body: 'Every hook, factory, type, and plugin, with the exact signatures.',
    to: '/docs/api',
  },
  {
    icon: RocketIcon,
    title: 'Deployment',
    body: 'Vercel, Netlify, Cloudflare Pages, and GitHub Pages — headers included.',
    to: '/docs/deployment',
  },
]

export function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-wash" aria-hidden="true" />
        <div className="grid-wash" aria-hidden="true" />

        <div className="shell hero__inner">
          <div className="hero__copy">
            <span className="badge badge--brand">
              <i aria-hidden="true" />
              Typed Web Workers for React
            </span>

            <h1 className="hero__title">
              Keep the main thread
              <br />
              for the <span className="marker">interface</span>.
            </h1>

            <p className="hero__lede">
              Move heavy computation into typed workers with hooks that feel native to React.
              Cancellable tasks, worker pools, shared atomics, and plugins — with no message-union
              boilerplate and no runtime dependencies.
            </p>

            <div className="hero__actions">
              <Link className="button button--primary" to="/docs/getting-started">
                Get started
                <ArrowIcon width={16} height={16} />
              </Link>
              <Link className="button" to="/playground">
                Open the playground
              </Link>
            </div>

            <div className="install-chip">
              <span className="install-chip__prompt">$</span>
              <code>npm install react-threaded</code>
            </div>

            <div className="hero__meta">
              <span>
                <b>React 18+</b> · concurrent-safe
              </span>
              <span>
                <b>Zero</b> runtime dependencies
              </span>
              <span>
                <b>MIT</b> licensed
              </span>
            </div>
          </div>

          <div className="hero__panel">
            <div className="hero__panel-head">
              <span className="live-dot" data-active="true" aria-hidden="true" />
              Runs off the main thread
            </div>
            <CodeBlock code={heroCode} title="Fibonacci.tsx" />
            <div className="hero__checks">
              <span>✓ inferred input</span>
              <span>✓ inferred output</span>
              <span>✓ cleanup on unmount</span>
            </div>
          </div>
        </div>

        <div className="shell">
          <div className="stats-strip">
            {stats.map((stat) => (
              <div className="stats-strip__item" key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="framework-strip">
        <div className="shell framework-strip__inner">
          <span className="framework-strip__label">Works with</span>
          {frameworks.map((framework) => (
            <Link key={framework.to} to={framework.to}>
              {framework.label}
            </Link>
          ))}
        </div>
      </div>

      <section className="section">
        <div className="shell">
          <div className="section__head section__head--center">
            <span className="eyebrow">Why react-threaded</span>
            <h2 className="section__title">A complete threading layer, not a wrapper.</h2>
            <p className="section__lede">
              Small, composable primitives that share one lifecycle model instead of six unrelated
              utilities.
            </p>
          </div>

          <div className="feature-grid">
            {features.map((feature) => {
              const Icon = feature.icon

              return (
                <article className="feature" key={feature.title}>
                  <span className="feature__icon">
                    <Icon width={18} height={18} />
                  </span>
                  <h3 className="feature__title">{feature.title}</h3>
                  <p className="feature__body">{feature.body}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="section section--surface">
        <div className="shell">
          <div className="section__head">
            <span className="eyebrow">The model</span>
            <h2 className="section__title">Three steps. No build plugin.</h2>
            <p className="section__lede">
              Workers are created from a Blob URL at runtime, so the same definition works in every
              bundler and every deployment target.
            </p>
          </div>

          <div className="steps">
            {steps.map((step) => (
              <article className="step" key={step.number}>
                <span className="step__number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>

          <div className="callout callout--wide">
            <span className="callout__icon">
              <PackageIcon width={16} height={16} />
            </span>
            <div>
              <strong>One package, two module formats.</strong>
              <p>
                Named ESM and CommonJS builds ship with their own declaration files. Tree-shaking
                keeps unused primitives out of your bundle.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="split">
            <div>
              <span className="eyebrow">Live, not a video</span>
              <h2 className="section__title">Break it in the playground.</h2>
              <p className="section__lede">
                Six real workloads run against the package source: cooperative cancellation, a
                100-million-number sieve, transferables, a four-worker pool, shared atomics, and
                retry plugins.
              </p>
              <div className="split__actions">
                <Link className="button button--primary" to="/playground">
                  Open playground
                  <ArrowIcon width={16} height={16} />
                </Link>
                <Link className="button" to="/examples">
                  Browse examples
                </Link>
              </div>
            </div>

            <div className="thread-demo" aria-hidden="true">
              <div className="thread-lane">
                <span className="thread-lane__name">Main thread</span>
                <div className="thread-lane__track">
                  <span className="thread-lane__fill thread-lane__fill--idle" />
                </div>
                <span className="thread-lane__value">16 ms frames</span>
              </div>
              <div className="thread-lane">
                <span className="thread-lane__name">Worker 1</span>
                <div className="thread-lane__track">
                  <span className="thread-lane__fill thread-lane__fill--busy" style={{ width: '82%' }} />
                </div>
                <span className="thread-lane__value">sieve</span>
              </div>
              <div className="thread-lane">
                <span className="thread-lane__name">Worker 2</span>
                <div className="thread-lane__track">
                  <span className="thread-lane__fill thread-lane__fill--hot" style={{ width: '64%' }} />
                </div>
                <span className="thread-lane__value">hash</span>
              </div>
              <div className="thread-lane">
                <span className="thread-lane__name">Worker 3</span>
                <div className="thread-lane__track">
                  <span className="thread-lane__fill thread-lane__fill--busy" style={{ width: '48%' }} />
                </div>
                <span className="thread-lane__value">parse</span>
              </div>
              <div className="thread-note">
                <TerminalIcon width={14} height={14} />
                UI stays interactive while workers finish
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--surface">
        <div className="shell">
          <div className="section__head section__head--center">
            <span className="eyebrow">Documentation</span>
            <h2 className="section__title">Go from install to production.</h2>
            <p className="section__lede">
              Framework recipes and platform guidance are written for the real constraints: client
              boundaries, headers, base paths, and SPA fallbacks.
            </p>
          </div>

          <div className="docs-teasers">
            {docsLinks.map((link) => {
              const Icon = link.icon

              return (
                <Link className="docs-teaser" key={link.to} to={link.to}>
                  <span className="docs-teaser__icon">
                    <Icon width={18} height={18} />
                  </span>
                  <h3>{link.title}</h3>
                  <p>{link.body}</p>
                  <span className="docs-teaser__more">
                    Read more
                    <ChevronRightIcon width={14} height={14} />
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="shell">
          <div className="cta__inner">
            <span className="eyebrow">Ship it</span>
            <h2>Give React its second thread.</h2>
            <p>
              Define a function, call it through a hook, and let the browser schedule the rest.
            </p>

            <div className="cta__actions">
              <div className="install-chip install-chip--large">
                <span className="install-chip__prompt">$</span>
                <code>pnpm add react-threaded</code>
              </div>
              <a
                className="button button--primary"
                href={repositoryUrl}
                target="_blank"
                rel="noreferrer"
              >
                <GithubIcon width={17} height={17} />
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
