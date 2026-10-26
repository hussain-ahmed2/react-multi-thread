import type { ReactNode } from 'react'

export type StatusTone = 'neutral' | 'info' | 'success' | 'danger' | 'warn'

export type StatusBadgeProps = {
  readonly tone?: StatusTone
  readonly children: ReactNode
  readonly pulse?: boolean
}

export function StatusBadge({ tone = 'neutral', children, pulse = false }: StatusBadgeProps) {
  return (
    <span className={`badge badge--${tone}${pulse ? ' badge--pulse' : ''}`}>
      <i aria-hidden="true" />
      {children}
    </span>
  )
}
