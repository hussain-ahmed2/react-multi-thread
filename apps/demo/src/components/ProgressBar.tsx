export type ProgressBarProps = {
  readonly value: number | null
  readonly tone?: 'accent' | 'success'
}

export function ProgressBar({ value, tone = 'accent' }: ProgressBarProps) {
  const clamped = value === null ? 0 : Math.min(1, Math.max(0, value))

  return (
    <div
      className={`progress progress--${tone}${value === null ? ' progress--indeterminate' : ''}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value === null ? undefined : Math.round(clamped * 100)}
    >
      <span className="progress__fill" style={{ width: `${clamped * 100}%` }} />
    </div>
  )
}
