export type DocLink = {
  readonly label: string
  readonly to: string
  readonly summary?: string
}

export type DocGroup = {
  readonly title: string
  readonly links: readonly DocLink[]
}

export const docGroups: readonly DocGroup[] = [
  {
    title: 'Start here',
    links: [
      {
        label: 'Overview',
        to: '/docs',
        summary: 'What react-threaded is, and when to reach for a worker.',
      },
      {
        label: 'Getting started',
        to: '/docs/getting-started',
        summary: 'Install the package and run your first typed worker.',
      },
      {
        label: 'Core concepts',
        to: '/docs/concepts',
        summary: 'The execution, cancellation, and memory model.',
      },
    ],
  },
  {
    title: 'API',
    links: [
      {
        label: 'API reference',
        to: '/docs/api',
        summary: 'Every hook, factory, type, and plugin at a glance.',
      },
    ],
  },
  {
    title: 'Frameworks',
    links: [
      {
        label: 'React + Vite',
        to: '/docs/frameworks/vite',
        summary: 'The reference setup, plus cross-origin isolation.',
      },
      {
        label: 'Next.js',
        to: '/docs/frameworks/nextjs',
        summary: 'App Router, client components, and headers.',
      },
      {
        label: 'React Router',
        to: '/docs/frameworks/react-router',
        summary: 'SPA and framework mode, routing, and fallbacks.',
      },
      {
        label: 'Astro',
        to: '/docs/frameworks/astro',
        summary: 'React islands that own a worker.',
      },
      {
        label: 'TanStack Start',
        to: '/docs/frameworks/tanstack-start',
        summary: 'Client-only routes, selective SSR, and request middleware.',
      },
      {
        label: 'Waku',
        to: '/docs/frameworks/waku',
        summary: 'Server Components with a client worker boundary.',
      },
      {
        label: 'RedwoodSDK',
        to: '/docs/frameworks/redwood-sdk',
        summary: 'React Server Components on Cloudflare Workers.',
      },
      {
        label: 'Gatsby',
        to: '/docs/frameworks/gatsby',
        summary: 'Static pages with a hydrated worker widget.',
      },
    ],
  },
  {
    title: 'Deployment',
    links: [
      {
        label: 'Deployment overview',
        to: '/docs/deployment',
        summary: 'Headers, MIME types, SPA fallbacks, and the SAB caveat.',
      },
      {
        label: 'Vercel',
        to: '/docs/deployment/vercel',
        summary: 'Headers and rewrites in vercel.json.',
      },
      {
        label: 'Netlify',
        to: '/docs/deployment/netlify',
        summary: 'netlify.toml, _headers, and redirects.',
      },
      {
        label: 'Cloudflare Pages',
        to: '/docs/deployment/cloudflare-pages',
        summary: 'Static output with a _headers file.',
      },
      {
        label: 'GitHub Pages',
        to: '/docs/deployment/github-pages',
        summary: 'Base paths, 404 fallback, and no custom headers.',
      },
    ],
  },
  {
    title: 'Help',
    links: [
      {
        label: 'Troubleshooting',
        to: '/docs/troubleshooting',
        summary: 'SharedArrayBuffer, CSP, SSR, and lifecycle issues.',
      },
    ],
  },
]

export const docPages: readonly DocLink[] = docGroups.flatMap((group) => group.links)

export function getDocPager(pathname: string): {
  readonly previous: DocLink | null
  readonly next: DocLink | null
} {
  const normalized = pathname.replace(/\/+$/, '') || '/docs'
  const index = docPages.findIndex((page) => page.to === normalized)

  if (index === -1) return { previous: null, next: null }

  return {
    previous: index > 0 ? docPages[index - 1] ?? null : null,
    next: index < docPages.length - 1 ? docPages[index + 1] ?? null : null,
  }
}
