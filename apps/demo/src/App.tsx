import { useState } from 'react'
import type { ComponentType } from 'react'
import { CodeBlock } from './components/CodeBlock'
import {
  AtomIcon,
  BoltIcon,
  GaugeIcon,
  GithubIcon,
  LayersIcon,
  ShieldIcon,
  ThreadIcon,
} from './components/Icons'
import type { IconProps } from './components/Icons'
import { PluginsDemo } from './demos/PluginsDemo'
import { PoolDemo } from './demos/PoolDemo'
import { PrimeDemo } from './demos/PrimeDemo'
import { ProxyDemo } from './demos/ProxyDemo'
import { SharedAtomDemo } from './demos/SharedAtomDemo'
import { TransferDemo } from './demos/TransferDemo'

const repositoryUrl = 'https://github.com/hussain-ahmed2/react-multi-thread'

const heroCode = `const double = createWorker((n: number) => n * 2)

function Counter() {
  const worker = useWorker(double)

  return (
    <button onClick={() => worker.run(21)}>
      {worker.result ?? 'Run'}
    </button>
  )
}`

type DemoTab = {
  readonly id: string
  readonly label: string
  readonly icon: ComponentType<IconProps>
  readonly Demo: ComponentType
}

const demoTabs: readonly DemoTab[] = [
  { id: 'cancellation', label: 'Cancellation', icon: GaugeIcon, Demo: PrimeDemo },
  { id: 'transfer', label: 'Transferables', icon: BoltIcon, Demo: TransferDemo },
  { id: 'pools', label: 'Pools', icon: LayersIcon, Demo: PoolDemo },
  { id: 'atomics', label: 'Shared atoms', icon: AtomIcon, Demo: SharedAtomDemo },
  { id: 'proxy', label: 'Proxy API', icon: ThreadIcon, Demo: ProxyDemo },
  { id: 'plugins', label: 'Retries & plugins', icon: ShieldIcon, Demo: PluginsDemo },
]

const features = [
  {
    icon: ThreadIcon,
    title: 'Typed by construction',
    body: 'The worker function is the single source of truth. Inputs, outputs, progress, and per-method arguments are inferred — no duplicated message unions.',
  },
  {
    icon: GaugeIcon,
    title: 'Cancellation that works',
    body: 'Hard terminate a synchronous loop and respawn it, or cancel cooperatively through SharedArrayBuffer and ctx.yield(). Late results can never overwrite newer state.',
  },
  {
    icon: LayersIcon,
    title: 'Pools and proxies',
    body: 'Fan out with a bounded worker pool, or expose methods as a Comlink-style promise API. Both share retries, plugins, and transferables.',
  },
  {
    icon: AtomIcon,
    title: 'Shared atomics',
    body: 'A reactive signed 32-bit atom backed by SharedArrayBuffer, Atomics, and BroadcastChannel, with polling and a graceful local fallback.',
  },
  {
    icon: ShieldIcon,
    title: 'Retries and plugins',
    body: 'Declare retry backoff and attach observational plugins for logs, timings, metrics, or tracing. Plugin failures never break a task.',
  },
  {
    icon: BoltIcon,
    title: 'Zero runtime deps',
    body: 'A small ESM + CJS package built on the platform: Blob workers, structured clone, transferables, AbortSignal, and React 18+ external stores.',
  },
] as const

const apiRows = [
  {
    signature: 'createWorker(handler, config?)',
    returns: 'WorkerDefinition',
    description: 'Serialise a function or method map into a branded, typed worker definition.',
  },
  {
    signature: 'useWorker(definition, config?)',
    returns: 'WorkerController',
    description: 'Run tasks with progress, results, retries, cancellation, timeout, and lifecycle state.',
  },
  {
    signature: 'createWorkerProxy / useWorkerProxy',
    returns: 'WorkerProxy',
    description:
      'Turn a methods worker into typed async functions — call api.hash(value) instead of call("hash", [value]).',
  },
  {
    signature: 'useWorkerPool(definition, { size })',
    returns: 'WorkerPoolController',
    description: 'Bounded concurrency with live stats, map(), run(), call(), and terminate().',
  },
  {
    signature: 'createSharedAtom(value, options?)',
    returns: 'SharedAtom',
    description: 'A numeric atom over SharedArrayBuffer + Atomics with subscriptions and BroadcastChannel.',
  },
  {
    signature: 'useSharedAtom(atom, { pollMs })',
    returns: '[value, setValue]',
    description: 'React binding built on useSyncExternalStore; polls cross-thread writes.',
  },
  {
    signature: 'loggerPlugin(config)',
    returns: 'WorkerPlugin',
    description: 'Structured lifecycle records for logs, metrics, or tracing pipelines.',
  },
  {
    signature: 'timingPlugin(config)',
    returns: 'WorkerPlugin',
    description: 'Per-attempt duration samples for latency dashboards and regressions.',
  },
] as const

const stats = [
  { value: '0', label: 'runtime dependencies' },
  { value: '40', label: 'tests passing' },
  { value: 'ESM + CJS', label: 'dual build' },
  { value: 'Strict', label: 'TypeScript' },
] as const

export function App() {
  const [activeId, setActiveId] = useState<string>('cancellation')
  const active = demoTabs.find((tab) => tab.id === activeId) ?? demoTabs[0]
  const ActiveDemo = active?.Demo ?? PrimeDemo

  return (
    <div className="site" id="top">
      <div className="site__glow" aria-hidden="true" />

      <header className="header">
        <div className="header__inner">
          <a className="brand" href="#top" aria-label="react-threaded home">
            <span className="brand__mark">
              <ThreadIcon width={20} height={20} />
            </span>
            <span className="brand__name">
              react<span>‑threaded</span>
            </span>
            <span className="brand__version">v0.1.0</span>
          </a>

          <nav className="nav" aria-label="Main navigation">
            <a className="nav__link" href="#playground">
              Playground
            </a>
            <a className="nav__link" href="#features">
              Features
            </a>
            <a className="nav__link" href="#api">
              API
            </a>
          </nav>

          <a
            className="button button--ghost button--sm header__github"
            href={repositoryUrl}
            target="_blank"
            rel="noreferrer"
          >
            <GithubIcon width={16} height={16} />
            GitHub
          </a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero__grid">
            <div className="hero__copy">
              <span className="pill">
                <i aria-hidden="true" />
                Web Workers for React
              </span>

              <h1 className="hero__title">
                Multithreading that feels like <span className="gradient-text">React</span>.
              </h1>

              <p className="hero__lede">
                Move heavy work off the main thread with typed hooks, cancellable tasks, worker
                pools, shared atomics, and plugins. No message-union boilerplate. No runtime
                dependencies.
              </p>

              <div className="hero__actions">
                <a className="button button--primary" href="#playground">
                  Open the playground
                  <span aria-hidden="true">→</span>
                </a>
                <a className="button button--ghost" href="#api">
                  Read the API
                </a>
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
                  <b>Worker-first</b> · no eval
                </span>
                <span>
                  <b>MIT</b> licensed
                </span>
              </div>
            </div>

            <div className="hero__panel">
              <CodeBlock code={heroCode} title="Counter.tsx" />

              <div className="hero__checks">
                <span>
                  <i>✓</i> inferred input
                </span>
                <span>
                  <i>✓</i> inferred output
                </span>
                <span>
                  <i>✓</i> cleanup on unmount
                </span>
              </div>
            </div>
          </div>

          <div className="stats-strip">
            {stats.map((stat) => (
              <div className="stats-strip__item" key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="playground">
          <div className="section__head">
            <span className="eyebrow">Live playground</span>
            <h2 className="section__title">Six real workloads. One API.</h2>
            <p className="section__lede">
              Everything below runs in your browser against the actual package source — not a video
              or a mock.
            </p>
          </div>

          <div className="playground">
            <div className="tabs" role="tablist" aria-label="Demos">
              {demoTabs.map((tab) => {
                const Icon = tab.icon

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={tab.id === active?.id}
                    className={`tab${tab.id === active?.id ? ' is-active' : ''}`}
                    onClick={() => setActiveId(tab.id)}
                  >
                    <Icon width={15} height={15} />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            <div className="playground__body" role="tabpanel">
              <ActiveDemo />
            </div>
          </div>
        </section>

        <section className="section" id="features">
          <div className="section__head">
            <span className="eyebrow">What is inside</span>
            <h2 className="section__title">A complete threading layer.</h2>
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
                    <Icon width={19} height={19} />
                  </span>
                  <h3 className="feature__title">{feature.title}</h3>
                  <p className="feature__body">{feature.body}</p>
                </article>
              )
            })}
          </div>

          <div className="callout callout--wide">
            <span className="callout__title">Built on the platform, not around it</span>
            <p>
              Workers are created from Blob URLs, so there is no build-plugin requirement and no{' '}
              <code>eval</code> or <code>new Function</code> at runtime. Tasks serialise through
              postMessage, transferables move ownership, AbortSignal cancels, and React 18 drives
              updates through external stores.
            </p>
          </div>
        </section>

        <section className="section" id="api">
          <div className="section__head">
            <span className="eyebrow">API reference</span>
            <h2 className="section__title">Read the surface in one screen.</h2>
            <p className="section__lede">
              Every entry point is tree-shakeable and fully typed. Named exports only — no default
              export to guess.
            </p>
          </div>

          <div className="api">
            <div className="api__head">
              <span>Signature</span>
              <span>Returns</span>
              <span>Description</span>
            </div>

            {apiRows.map((row) => (
              <div className="api__row" key={row.signature}>
                <code className="api__signature">{row.signature}</code>
                <span className="api__returns">{row.returns}</span>
                <span className="api__description">{row.description}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="cta">
          <div className="cta__inner">
            <span className="eyebrow">Ship it</span>
            <h2>Give React its second thread.</h2>
            <p>
              Install the package, define a function, and call it. The worker boundary is inferred
              from your code.
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
        </section>
      </main>

      <footer className="footer">
        <div className="footer__inner">
          <span className="footer__brand">
            <ThreadIcon width={17} height={17} />
            react-threaded
          </span>
          <span className="footer__note">
            Built with React, TypeScript, Vite, and the Web Worker platform.
          </span>
          <div className="footer__links">
            <a href="#playground">Playground</a>
            <a href="#api">API</a>
            <a href={repositoryUrl} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
