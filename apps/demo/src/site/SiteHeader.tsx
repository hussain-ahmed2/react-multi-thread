import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  CloseIcon,
  GithubIcon,
  MenuIcon,
  MoonIcon,
  SunIcon,
  ThreadIcon,
} from '../components/Icons'
import { useTheme } from './theme'

const repositoryUrl = 'https://github.com/hussain-ahmed2/react-threaded'

const navigation = [
  { to: '/docs', label: 'Docs' },
  { to: '/playground', label: 'Playground' },
  { to: '/examples', label: 'Examples' },
] as const

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      className="icon-button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {theme === 'dark' ? <SunIcon width={17} height={17} /> : <MoonIcon width={17} height={17} />}
    </button>
  )
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Link className="brand" to="/" aria-label="react-threaded home">
          <span className="brand__mark">
            <ThreadIcon width={19} height={19} />
          </span>
          <span className="brand__name">
            react<span>‑threaded</span>
          </span>
          <span className="brand__version">v0.1.0</span>
        </Link>

        <nav
          id="site-navigation"
          className={`site-nav${menuOpen ? ' is-open' : ''}`}
          aria-label="Main navigation"
        >
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `site-nav__link${isActive ? ' is-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
          <a
            className="site-nav__link site-nav__link--mobile"
            href={repositoryUrl}
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>

        <div className="site-header__actions">
          <a
            className="icon-button"
            href={repositoryUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="react-threaded on GitHub"
          >
            <GithubIcon width={17} height={17} />
          </a>
          <ThemeToggle />
          <button
            type="button"
            className="icon-button site-header__menu"
            aria-expanded={menuOpen}
            aria-controls="site-navigation"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <CloseIcon width={18} height={18} /> : <MenuIcon width={18} height={18} />}
          </button>
        </div>
      </div>
    </header>
  )
}
