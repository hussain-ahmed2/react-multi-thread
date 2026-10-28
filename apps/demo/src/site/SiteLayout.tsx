import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { usePageMetadata } from './seo'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash !== '') return
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname, hash])

  return null
}

export function SiteLayout() {
  usePageMetadata()

  return (
    <div className="site">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <ScrollToTop />
      <SiteHeader />
      <main className="site-main" id="main">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
