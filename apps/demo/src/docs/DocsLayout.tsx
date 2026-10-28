import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ChevronRightIcon, TerminalIcon } from '../components/Icons'
import { docGroups, getDocPager } from './nav'

type TocHeading = {
  readonly id: string
  readonly label: string
}

function DocsNavigation({ onNavigate }: { readonly onNavigate?: () => void }) {
  return (
    <nav className="docs-nav" aria-label="Documentation">
      {docGroups.map((group) => (
        <div className="docs-nav__group" key={group.title}>
          <span className="docs-nav__title">{group.title}</span>
          {group.links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/docs'}
              onClick={onNavigate}
              className={({ isActive }) => `docs-nav__link${isActive ? ' is-active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}

export function DocsLayout() {
  const { pathname } = useLocation()
  const articleRef = useRef<HTMLDivElement>(null)
  const mobileNavRef = useRef<HTMLDetailsElement>(null)
  const [headings, setHeadings] = useState<readonly TocHeading[]>([])
  const [activeHeading, setActiveHeading] = useState<string>('')
  const pager = getDocPager(pathname)

  useEffect(() => {
    const container = articleRef.current
    if (container === null) return

    const nodes = Array.from(container.querySelectorAll<HTMLHeadingElement>('h2[id]'))
    setHeadings(nodes.map((node) => ({ id: node.id, label: node.textContent ?? node.id })))
    setActiveHeading('')

    if (nodes.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        const first = visible[0]
        if (first !== undefined) setActiveHeading(first.target.id)
      },
      { rootMargin: '-96px 0px -68% 0px', threshold: [0, 1] },
    )

    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [pathname])

  return (
    <div className="docs">
      <div className="shell docs__shell">
        <aside className="docs__sidebar">
          <DocsNavigation />
          <div className="docs-install">
            <span className="docs-install__label">
              <TerminalIcon width={14} height={14} />
              Install
            </span>
            <code>pnpm add react-threaded</code>
          </div>
        </aside>

        <div className="docs__content">
          <details className="docs-mobile" ref={mobileNavRef}>
            <summary>Browse documentation</summary>
            <DocsNavigation onNavigate={() => mobileNavRef.current?.removeAttribute('open')} />
          </details>

          <div ref={articleRef}>
            <Outlet />
          </div>

          {pager.previous === null && pager.next === null ? null : (
            <nav className="doc-pager" aria-label="Documentation pagination">
              {pager.previous === null ? (
                <span />
              ) : (
                <Link className="doc-pager__link doc-pager__link--previous" to={pager.previous.to}>
                  <span>Previous</span>
                  <strong>{pager.previous.label}</strong>
                </Link>
              )}
              {pager.next === null ? (
                <span />
              ) : (
                <Link className="doc-pager__link doc-pager__link--next" to={pager.next.to}>
                  <span>Next</span>
                  <strong>{pager.next.label}</strong>
                </Link>
              )}
            </nav>
          )}
        </div>

        <aside className="docs__toc" aria-label="On this page">
          {headings.length === 0 ? null : (
            <>
              <span className="docs__toc-title">On this page</span>
              <nav>
                {headings.map((heading) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    className={heading.id === activeHeading ? 'is-active' : undefined}
                  >
                    {heading.label}
                  </a>
                ))}
              </nav>
            </>
          )}

          <Link className="docs__toc-cta" to="/playground">
            Try the playground
            <ChevronRightIcon width={14} height={14} />
          </Link>
        </aside>
      </div>
    </div>
  )
}
