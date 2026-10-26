import type { ReactNode } from 'react'

export type StatTone = 'default' | 'accent' | 'success' | 'danger'

export type StatProps = {
  readonly label: string
  readonly value: ReactNode
  readonly tone?: StatTone
}

export function Stat({ label, value, tone = 'default' }: StatProps) {
  return (
    <div className={`stat stat--${tone}`}>
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
    </div>
  )
}
