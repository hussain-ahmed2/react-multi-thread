import { Link } from 'react-router-dom'
import { GithubIcon, ThreadIcon } from '../components/Icons'

const repositoryUrl = 'https://github.com/hussain-ahmed2/react-threaded'

const columns = [
  {
    title: 'Documentation',
    links: [
      { label: 'Getting started', to: '/docs/getting-started' },
      { label: 'Core concepts', to: '/docs/concepts' },
      { label: 'API reference', to: '/docs/api' },
      { label: 'Troubleshooting', to: '/docs/troubleshooting' },
    ],
  },
  {
    title: 'Frameworks',
    links: [
      { label: 'React + Vite', to: '/docs/frameworks/vite' },
      { label: 'Next.js', to: '/docs/frameworks/nextjs' },
      { label: 'React Router', to: '/docs/frameworks/react-router' },
      { label: 'Astro', to: '/docs/frameworks/astro' },
      { label: 'TanStack Start', to: '/docs/frameworks/tanstack-start' },
      { label: 'Waku', to: '/docs/frameworks/waku' },
      { label: 'RedwoodSDK', to: '/docs/frameworks/redwood-sdk' },
      { label: 'Gatsby', to: '/docs/frameworks/gatsby' },
    ],
  },
  {
    title: 'Deploy',
    links: [
      { label: 'Deployment guide', to: '/docs/deployment' },
      { label: 'Vercel', to: '/docs/deployment/vercel' },
      { label: 'Netlify', to: '/docs/deployment/netlify' },
      { label: 'Cloudflare Pages', to: '/docs/deployment/cloudflare-pages' },
      { label: 'GitHub Pages', to: '/docs/deployment/github-pages' },
    ],
  },
] as const

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="site-footer__top">
          <div className="site-footer__brand-block">
            <Link className="brand brand--footer" to="/">
              <span className="brand__mark">
                <ThreadIcon width={18} height={18} />
              </span>
              <span className="brand__name">
                react<span>‑threaded</span>
              </span>
            </Link>
            <p>
              A typed threading layer for React. Workers, pools, shared memory, and plugins built on
              the platform.
            </p>
            <a className="text-link" href={repositoryUrl} target="_blank" rel="noreferrer">
              <GithubIcon width={15} height={15} />
              hussain-ahmed2/react-threaded
            </a>
          </div>

          <div className="site-footer__columns">
            {columns.map((column) => (
              <div className="site-footer__column" key={column.title}>
                <span className="site-footer__heading">{column.title}</span>
                {column.links.map((link) => (
                  <Link key={link.to} to={link.to}>
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="site-footer__bottom">
          <span>MIT licensed · Built with React, TypeScript, and Vite.</span>
          <span className="site-footer__status">
            <i aria-hidden="true" />
            v0.1.0 · ESM + CJS
          </span>
        </div>
      </div>
    </footer>
  )
}
