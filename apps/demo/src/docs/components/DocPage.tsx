import type { ReactNode } from 'react'

export type DocPageProps = {
  readonly eyebrow: string
  readonly title: string
  readonly lede: ReactNode
  readonly children: ReactNode
}

export function DocPage({ eyebrow, title, lede, children }: DocPageProps) {
  return (
    <article className="doc">
      <header className="doc__header">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="doc__lede">{lede}</p>
        <p className="doc__updated">
          Last updated <time dateTime="2026-10-28">October 28, 2026</time>
        </p>
      </header>

      <div className="prose">{children}</div>
    </article>
  )
}

export type DocSectionProps = {
  readonly id: string
  readonly title: string
  readonly lede?: ReactNode
  readonly children: ReactNode
}

export function DocSection({ id, title, lede, children }: DocSectionProps) {
  return (
    <section className="doc-section" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {lede === undefined ? null : <p className="doc-section__lede">{lede}</p>}
      {children}
    </section>
  )
}
