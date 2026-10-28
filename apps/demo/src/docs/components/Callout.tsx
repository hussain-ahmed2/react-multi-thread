import type { ReactNode } from 'react'
import { AlertIcon, CheckIcon, InfoIcon } from '../../components/Icons'

export type CalloutTone = 'note' | 'tip' | 'warning'

export type CalloutProps = {
  readonly tone?: CalloutTone
  readonly title: string
  readonly children: ReactNode
}

export function Callout({ tone = 'note', title, children }: CalloutProps) {
  const Icon = tone === 'warning' ? AlertIcon : tone === 'tip' ? CheckIcon : InfoIcon

  return (
    <aside className={`callout callout--${tone}`}>
      <span className="callout__icon">
        <Icon width={16} height={16} />
      </span>
      <div>
        <strong>{title}</strong>
        <div className="callout__body">{children}</div>
      </div>
    </aside>
  )
}
