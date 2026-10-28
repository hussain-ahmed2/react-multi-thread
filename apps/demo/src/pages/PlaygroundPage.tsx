import type { ComponentType } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AtomIcon,
  BoltIcon,
  GaugeIcon,
  LayersIcon,
  RocketIcon,
  ShieldIcon,
  ThreadIcon,
} from '../components/Icons'
import type { IconProps } from '../components/Icons'
import { CanvasDemo } from '../demos/CanvasDemo'
import { PluginsDemo } from '../demos/PluginsDemo'
import { PoolDemo } from '../demos/PoolDemo'
import { PrimeDemo } from '../demos/PrimeDemo'
import { ProxyDemo } from '../demos/ProxyDemo'
import { SharedAtomDemo } from '../demos/SharedAtomDemo'
import { TransferDemo } from '../demos/TransferDemo'

type DemoTab = {
  readonly id: string
  readonly label: string
  readonly icon: ComponentType<IconProps>
  readonly Demo: ComponentType
}

const demoTabs: readonly DemoTab[] = [
  { id: 'canvas', label: 'Canvas swarm', icon: RocketIcon, Demo: CanvasDemo },
  { id: 'cancellation', label: 'Cancellation', icon: GaugeIcon, Demo: PrimeDemo },
  { id: 'transfer', label: 'Transferables', icon: BoltIcon, Demo: TransferDemo },
  { id: 'pools', label: 'Pools', icon: LayersIcon, Demo: PoolDemo },
  { id: 'atomics', label: 'Shared atoms', icon: AtomIcon, Demo: SharedAtomDemo },
  { id: 'proxy', label: 'Proxy API', icon: ThreadIcon, Demo: ProxyDemo },
  { id: 'plugins', label: 'Retries & plugins', icon: ShieldIcon, Demo: PluginsDemo },
]

export function PlaygroundPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('demo')
  const active = demoTabs.find((tab) => tab.id === requested) ?? demoTabs[0]
  const activeId = active?.id ?? 'canvas'
  const ActiveDemo = active?.Demo ?? CanvasDemo

  const selectDemo = (id: string) => {
    setSearchParams({ demo: id })
  }

  return (
    <div className="page">
      <section className="page-masthead">
        <div className="hero-wash" aria-hidden="true" />
        <div className="grid-wash" aria-hidden="true" />
        <div className="shell page-masthead__inner">
          <span className="eyebrow">Live playground</span>
          <h1>Seven workloads. One typed API.</h1>
          <p>
            Everything below runs in your browser against the actual package source — not a video,
            a mock, or a pre-recorded result. Open DevTools and watch the threads.
          </p>
          <div className="page-masthead__actions">
            <Link className="button" to="/docs/getting-started">
              Read the quick start
            </Link>
            <Link className="button button--ghost" to="/docs/concepts">
              Core concepts
            </Link>
          </div>
        </div>
      </section>

      <section className="playground-section">
        <div className="shell">
          <div className="playground">
            <div className="tabs" role="tablist" aria-label="Demos">
              {demoTabs.map((tab) => {
                const Icon = tab.icon
                const selected = tab.id === activeId

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`demo-tab-${tab.id}`}
                    aria-selected={selected}
                    aria-controls="demo-panel"
                    tabIndex={selected ? 0 : -1}
                    className={`tab${selected ? ' is-active' : ''}`}
                    onClick={() => selectDemo(tab.id)}
                  >
                    <Icon width={15} height={15} />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            <div
              className="playground__body"
              id="demo-panel"
              role="tabpanel"
              aria-labelledby={`demo-tab-${activeId}`}
            >
              <ActiveDemo />
            </div>
          </div>

          <p className="playground__note">
            Cross-origin isolation is enabled on this site so the shared-atomics demo can use{' '}
            <code>SharedArrayBuffer</code>. Other demos need no special headers. Read the{' '}
            <Link to="/docs/deployment">deployment guide</Link> before you ship.
          </p>
        </div>
      </section>
    </div>
  )
}
