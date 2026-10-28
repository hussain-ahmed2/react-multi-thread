export type PlatformKey = 'vercel' | 'netlify' | 'cloudflare' | 'github'

export type SupportLevel = 'native' | 'adapter' | 'hybrid' | 'static' | 'spa' | 'unsupported'

export type RecipeFile = {
  readonly title: string
  readonly code: string
}

export type Recipe = {
  readonly platform: string
  readonly support: SupportLevel
  readonly summary: string
  readonly files: readonly RecipeFile[]
}

export type FrameworkDeployment = {
  readonly id: string
  readonly name: string
  readonly summary: string
  readonly support: Readonly<Record<PlatformKey, SupportLevel>>
  readonly recipes: readonly Recipe[]
}

export const platforms: readonly { readonly key: PlatformKey; readonly label: string }[] = [
  { key: 'vercel', label: 'Vercel' },
  { key: 'netlify', label: 'Netlify' },
  { key: 'cloudflare', label: 'Cloudflare' },
  { key: 'github', label: 'GitHub Pages' },
]

export const supportLabels: Readonly<Record<SupportLevel, string>> = {
  native: 'Native server',
  adapter: 'Server adapter',
  hybrid: 'Static or adapter',
  static: 'Static',
  spa: 'Static SPA',
  unsupported: 'Not supported',
}

export const supportShortLabels: Readonly<Record<SupportLevel, string>> = {
  native: 'Native',
  adapter: 'Adapter',
  hybrid: 'Static/adapter',
  static: 'Static',
  spa: 'SPA',
  unsupported: 'No',
}

export const supportClasses: Readonly<Record<SupportLevel, string>> = {
  native: 'badge badge--success',
  adapter: 'badge badge--info',
  hybrid: 'badge badge--brand',
  static: 'badge',
  spa: 'badge badge--warn',
  unsupported: 'badge badge--danger',
}

const nextHeadersConfig = `// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ]
  },
}

export default nextConfig`

const nextNetlifyConfig = `# netlify.toml
[build]
  command = "pnpm build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "24"`

const nextCloudflareConfig = `{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "my-next-app",
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-10-28",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}`

const nextCloudflareAdapter = `// open-next.config.ts
import { defineCloudflareConfig } from '@opennextjs/cloudflare'

export default defineCloudflareConfig()`

const nextCloudflareScripts = `{
  "scripts": {
    "build": "next build",
    "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"
  }
}`

const nextGithubConfig = `// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: process.env.PAGES_BASE_PATH,
}

export default nextConfig`

const nextGithubWorkflow = `name: Deploy Next.js to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11.15.1
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: actions/configure-pages@v5
        id: pages
      - run: pnpm build
        env:
          PAGES_BASE_PATH: \${{ steps.pages.outputs.base_path }}
      - run: touch out/.nojekyll
      - uses: actions/upload-pages-artifact@v3
        with:
          path: out

  deploy:
    runs-on: ubuntu-latest
    needs: build
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment`

const reactRouterVercelConfig = `// react-router.config.ts
import type { Config } from '@react-router/dev/config'
import { vercelPreset } from '@vercel/react-router/vite'

export default {
  ssr: true,
  presets: [vercelPreset()],
} satisfies Config`

const reactRouterNetlifyVite = `// vite.config.ts
import { reactRouter } from '@react-router/dev/vite'
import netlifyReactRouter from '@netlify/vite-plugin-react-router'
import netlify from '@netlify/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [reactRouter(), netlifyReactRouter(), netlify()],
})`

const reactRouterNetlifyToml = `# netlify.toml
[build]
  command = "react-router build"
  publish = "build/client"

[dev]
  command = "react-router dev"`

const reactRouterCloudflareVite = `// vite.config.ts
import { reactRouter } from '@react-router/dev/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    reactRouter(),
  ],
})`

const reactRouterCloudflareRouter = `// react-router.config.ts
import type { Config } from '@react-router/dev/config'

export default {
  ssr: true,
  future: { unstable_viteEnvironmentApi: true },
} satisfies Config`

const reactRouterCloudflareWorker = `// workers/app.ts
import { createRequestHandler } from 'react-router'
import * as build from '../build/server'

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return createRequestHandler(build, 'production')(request, env, ctx)
  },
}`

const reactRouterCloudflareWrangler = `{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "react-router-app",
  "main": "./workers/app.ts",
  "compatibility_date": "2026-10-28",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": "./build/client" },
  "observability": { "enabled": true }
}`

const reactRouterGithubConfig = `// react-router.config.ts
import type { Config } from '@react-router/dev/config'

export default {
  ssr: false,
  basename: '/repo-name',
} satisfies Config`

const reactRouterGithubVite = `// vite.config.ts
import { reactRouter } from '@react-router/dev/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/repo-name/',
  plugins: [reactRouter()],
})`

const viteConfig = `// vite.config.ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const isolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react()],
  server: { headers: isolation },
  preview: { headers: isolation },
})`

const viteVercelConfig = `{
  "framework": "vite",
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ],
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}`

const viteNetlifyConfig = `# netlify.toml
[build]
  command = "pnpm build"
  publish = "dist"

[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200`

const viteCloudflareConfig = `# public/_headers
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp

# public/_redirects
/*  /index.html  200`

const viteGithubCommands = `VITE_BASE_PATH=/repo-name/ pnpm build
cp dist/index.html dist/404.html
touch dist/.nojekyll`

const astroVercelConfig = `// astro.config.mjs
import vercel from '@astrojs/vercel'
import { defineConfig } from 'astro/config'

const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig({
  adapter: vercel(),
  server: { headers: crossOriginIsolation },
})`

const astroVercelJson = `{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}`

const astroNetlifyConfig = `// astro.config.mjs
import netlify from '@astrojs/netlify'
import { defineConfig } from 'astro/config'

const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig({
  adapter: netlify(),
  server: { headers: crossOriginIsolation },
})`

const astroNetlifyToml = `# netlify.toml
[build]
  command = "pnpm build"
  publish = "dist"

[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"`

const astroCloudflareConfig = `// astro.config.mjs
import cloudflare from '@astrojs/cloudflare'
import { defineConfig } from 'astro/config'

const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig({
  adapter: cloudflare(),
  server: { headers: crossOriginIsolation },
})`

const astroCloudflareHeaders = `# public/_headers
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp`

const astroGithubConfig = `// astro.config.mjs
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://hussain-ahmed2.github.io',
  base: '/repo-name/',
})`

const tanstackVercelConfig = `// vite.config.ts
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tanstackStart(), nitro(), viteReact()],
})`

const tanstackNetlifyConfig = `// vite.config.ts
import netlify from '@netlify/vite-plugin-tanstack-start'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tanstackStart(), netlify(), viteReact()],
})`

const tanstackNetlifyToml = `# netlify.toml
[build]
  command = "vite build"
  publish = "dist/client"`

const tanstackCloudflareConfig = `// vite.config.ts
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart(),
    viteReact(),
  ],
})`

const tanstackCloudflareWrangler = `{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "tanstack-start-app",
  "main": "@tanstack/react-start/server-entry",
  "compatibility_date": "2026-10-28",
  "compatibility_flags": ["nodejs_compat"]
}`

const tanstackGithubConfig = `// vite.config.ts
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/repo-name/',
  plugins: [
    tanstackStart({
      spa: { enabled: true },
    }),
    viteReact(),
  ],
})`

const tanstackGithubRouter = `// src/router.tsx
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export const router = createRouter({
  routeTree,
  basepath: '/repo-name',
})`

const tanstackGithubCommands = `pnpm build
cp dist/client/_shell.html dist/client/404.html
touch dist/client/.nojekyll`

const wakuVercelConfig = `// src/waku.server.tsx
import { fsRouter } from 'waku'
import adapter from 'waku/adapters/vercel'

export default adapter(
  fsRouter(import.meta.glob('./pages/**/*.{tsx,ts}')),
)`

const wakuNetlifyConfig = `// src/waku.server.tsx
import { fsRouter } from 'waku'
import adapter from 'waku/adapters/netlify'

export default adapter(
  fsRouter(import.meta.glob('./pages/**/*.{tsx,ts}')),
)`

const wakuNetlifyToml = `# netlify.toml
[build]
  command = "NETLIFY=1 pnpm build"
  publish = "dist/public"`

const wakuCloudflareConfig = `// src/waku.server.tsx
import { fsRouter } from 'waku'
import adapter from 'waku/adapters/cloudflare'

export default adapter(
  fsRouter(import.meta.glob('./pages/**/*.{tsx,ts}')),
)`

const wakuCloudflareWrangler = `{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "waku-app",
  "main": "./dist/worker.js",
  "compatibility_date": "2026-10-28",
  "assets": {
    "directory": "./dist/public",
    "binding": "ASSETS",
    "html_handling": "drop-trailing-slash"
  },
  "observability": { "enabled": true }
}`

const wakuGithubConfig = `// waku.config.ts
import { defineConfig } from 'waku/config'

export default defineConfig({
  vite: { base: '/repo-name/' },
})`

const gatsbyVercelConfig = `{
  "framework": "gatsby",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}`

const gatsbyNetlifyConfig = `# netlify.toml
[build]
  command = "pnpm build"
  publish = "public"

[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"`

const gatsbyCloudflareConfig = `# public/_headers
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp`

const gatsbyGithubConfig = `// gatsby-config.ts
import type { GatsbyConfig } from 'gatsby'

const config: GatsbyConfig = {
  pathPrefix: '/repo-name',
}

export default config`

const gatsbyGithubCommands = `pnpm build --prefix-paths
touch public/.nojekyll`

const redwoodCloudflareWrangler = `{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "my-redwood-app",
  "main": "./src/worker.tsx",
  "compatibility_date": "2026-10-28",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./public",
    "binding": "ASSETS"
  }
}`

export const frameworkDeployments: readonly FrameworkDeployment[] = [
  {
    id: 'nextjs',
    name: 'Next.js',
    summary:
      'Use Client Components for every worker hook. The server runtime stays in the framework adapter; only a static export is hostable on GitHub Pages.',
    support: {
      vercel: 'native',
      netlify: 'adapter',
      cloudflare: 'adapter',
      github: 'static',
    },
    recipes: [
      {
        platform: 'Vercel',
        support: 'native',
        summary:
          'Vercel runs Next.js natively. Keep isolation headers in next.config.ts so next dev and production share one definition. Do not add an SPA rewrite.',
        files: [{ title: 'next.config.ts', code: nextHeadersConfig }],
      },
      {
        platform: 'Netlify',
        support: 'adapter',
        summary:
          'Netlify detects Next.js and installs its current OpenNext adapter. Publish .next, not out, and never redirect every path to index.html. Headers stay in next.config.ts so next dev and Netlify use the same rules.',
        files: [
          { title: 'netlify.toml', code: nextNetlifyConfig },
          { title: 'next.config.ts', code: nextHeadersConfig },
        ],
      },
      {
        platform: 'Cloudflare',
        support: 'adapter',
        summary:
          'Use the OpenNext Cloudflare adapter for an existing Next.js app. Cloudflare now recommends vinext for new Next.js projects, but OpenNext remains supported. Do not add _redirects for the app router.',
        files: [
          { title: 'wrangler.jsonc', code: nextCloudflareConfig },
          { title: 'open-next.config.ts', code: nextCloudflareAdapter },
          { title: 'package.json', code: nextCloudflareScripts },
          { title: 'next.config.ts', code: nextHeadersConfig },
        ],
      },
      {
        platform: 'GitHub Pages',
        support: 'static',
        summary:
          'GitHub Pages can only host a static export. Next.js headers() and rewrites are ignored, so shared atomics cannot work there. The workflow reads the repository base path from configure-pages.',
        files: [
          { title: 'next.config.ts', code: nextGithubConfig },
          { title: '.github/workflows/deploy.yml', code: nextGithubWorkflow },
        ],
      },
    ],
  },
  {
    id: 'react-router',
    name: 'React Router',
    summary:
      'Framework mode has server presets for Vercel, Netlify, and Cloudflare. GitHub Pages requires ssr: false and must not receive a server build.',
    support: {
      vercel: 'adapter',
      netlify: 'adapter',
      cloudflare: 'adapter',
      github: 'spa',
    },
    recipes: [
      {
        platform: 'Vercel',
        support: 'adapter',
        summary:
          'Install @vercel/react-router and add the preset. Vercel builds the client and server bundles itself; no vercel.json rewrite is needed.',
        files: [{ title: 'react-router.config.ts', code: reactRouterVercelConfig }],
      },
      {
        platform: 'Netlify',
        support: 'adapter',
        summary:
          'Install @netlify/vite-plugin-react-router with @netlify/vite-plugin. The React Router plugin wires the server handler into Netlify Functions; the Netlify plugin provides local platform parity.',
        files: [
          { title: 'vite.config.ts', code: reactRouterNetlifyVite },
          { title: 'netlify.toml', code: reactRouterNetlifyToml },
        ],
      },
      {
        platform: 'Cloudflare',
        support: 'adapter',
        summary:
          'Use the Cloudflare Vite plugin with React Router v8. On React Router v7, enable the unstable Vite environment API. Cloudflare does not support SPA mode or prerendering through this plugin.',
        files: [
          { title: 'vite.config.ts', code: reactRouterCloudflareVite },
          { title: 'react-router.config.ts', code: reactRouterCloudflareRouter },
          { title: 'workers/app.ts', code: reactRouterCloudflareWorker },
          { title: 'wrangler.json', code: reactRouterCloudflareWrangler },
        ],
      },
      {
        platform: 'GitHub Pages',
        support: 'spa',
        summary:
          'Set ssr: false, set both Vite base and React Router basename to the repository path, then copy index.html to 404.html. This is a client-rendered app, not a server deployment.',
        files: [
          { title: 'react-router.config.ts', code: reactRouterGithubConfig },
          { title: 'vite.config.ts', code: reactRouterGithubVite },
          {
            title: 'Deploy',
            code: `pnpm build
cp build/client/index.html build/client/404.html
touch build/client/.nojekyll`,
          },
        ],
      },
    ],
  },
  {
    id: 'vite',
    name: 'React + Vite',
    summary:
      'One static build. BrowserRouter needs a host rewrite or 404 fallback, and COOP/COEP must be repeated in host configuration because Vite only applies headers to its dev and preview servers.',
    support: {
      vercel: 'static',
      netlify: 'static',
      cloudflare: 'static',
      github: 'static',
    },
    recipes: [
      {
        platform: 'Vercel',
        support: 'static',
        summary:
          'Use the Vite framework preset, set outputDirectory to dist, and add headers plus the SPA rewrite in vercel.json.',
        files: [
          { title: 'vite.config.ts', code: viteConfig },
          { title: 'vercel.json', code: viteVercelConfig },
        ],
      },
      {
        platform: 'Netlify',
        support: 'static',
        summary:
          'Put build, headers, and the SPA redirect in one netlify.toml. The redirect is only safe because this is a client-rendered app.',
        files: [
          { title: 'vite.config.ts', code: viteConfig },
          { title: 'netlify.toml', code: viteNetlifyConfig },
        ],
      },
      {
        platform: 'Cloudflare',
        support: 'static',
        summary:
          'Cloudflare Pages reads _headers and _redirects from the publish directory. Put both files in public so Vite copies them into dist.',
        files: [
          { title: 'vite.config.ts', code: viteConfig },
          { title: 'public/_headers and public/_redirects', code: viteCloudflareConfig },
        ],
      },
      {
        platform: 'GitHub Pages',
        support: 'static',
        summary:
          'Set VITE_BASE_PATH to /repo-name/ in the build, derive the router basename from it, and generate 404.html. GitHub Pages cannot set COOP or COEP, so shared memory must stay optional.',
        files: [
          { title: 'vite.config.ts', code: viteConfig },
          { title: 'Deploy commands', code: viteGithubCommands },
        ],
      },
    ],
  },
  {
    id: 'astro',
    name: 'Astro',
    summary:
      'Astro is static by default. Add an adapter only for on-demand routes. The React island owns the worker; the surrounding page stays server-rendered or static.',
    support: {
      vercel: 'hybrid',
      netlify: 'hybrid',
      cloudflare: 'hybrid',
      github: 'static',
    },
    recipes: [
      {
        platform: 'Vercel',
        support: 'hybrid',
        summary:
          'Omit @astrojs/vercel for a fully static site. Add it when any route opts out of prerendering. Top-level server.headers covers astro dev and preview; vercel.json covers production.',
        files: [
          { title: 'astro.config.mjs', code: astroVercelConfig },
          { title: 'vercel.json', code: astroVercelJson },
        ],
      },
      {
        platform: 'Netlify',
        support: 'hybrid',
        summary:
          'Static sites need no adapter. Add @astrojs/netlify for on-demand pages. Netlify publishes dist and applies headers from public/_headers or netlify.toml.',
        files: [
          { title: 'astro.config.mjs', code: astroNetlifyConfig },
          { title: 'netlify.toml', code: astroNetlifyToml },
        ],
      },
      {
        platform: 'Cloudflare',
        support: 'hybrid',
        summary:
          'Deploy a static site to Cloudflare Pages, or add @astrojs/cloudflare for on-demand rendering. The adapter emits the Pages worker entry; do not add an SPA redirect.',
        files: [
          { title: 'astro.config.mjs', code: astroCloudflareConfig },
          { title: 'public/_headers', code: astroCloudflareHeaders },
        ],
      },
      {
        platform: 'GitHub Pages',
        support: 'static',
        summary:
          'Only static Astro output can ship to GitHub Pages. Set site and base so canonical URLs and asset paths include the repository subpath.',
        files: [{ title: 'astro.config.mjs', code: astroGithubConfig }],
      },
    ],
  },
  {
    id: 'tanstack-start',
    name: 'TanStack Start',
    summary:
      'The default build is a server application through Nitro or a platform Vite plugin. GitHub Pages works only in SPA mode, which emits _shell.html.',
    support: {
      vercel: 'adapter',
      netlify: 'adapter',
      cloudflare: 'adapter',
      github: 'spa',
    },
    recipes: [
      {
        platform: 'Vercel',
        support: 'adapter',
        summary:
          'Add Nitro to Vite and deploy the generated .output directory through Vercel. Select the Nitro framework preset if Vercel does not detect it.',
        files: [{ title: 'vite.config.ts', code: tanstackVercelConfig }],
      },
      {
        platform: 'Netlify',
        support: 'adapter',
        summary:
          'Install @netlify/vite-plugin-tanstack-start and add the plugin after tanstackStart. Netlify wires the server function and client assets automatically.',
        files: [
          { title: 'vite.config.ts', code: tanstackNetlifyConfig },
          { title: 'netlify.toml', code: tanstackNetlifyToml },
        ],
      },
      {
        platform: 'Cloudflare',
        support: 'adapter',
        summary:
          'Use the Cloudflare Vite plugin with the server entry. Deploy with Wrangler; do not add a Pages SPA fallback to this server build.',
        files: [
          { title: 'vite.config.ts', code: tanstackCloudflareConfig },
          { title: 'wrangler.jsonc', code: tanstackCloudflareWrangler },
        ],
      },
      {
        platform: 'GitHub Pages',
        support: 'spa',
        summary:
          'Enable SPA mode, set the Vite base and router basepath to the repository path, then serve _shell.html as 404.html for deep links.',
        files: [
          { title: 'vite.config.ts', code: tanstackGithubConfig },
          { title: 'src/router.tsx', code: tanstackGithubRouter },
          { title: 'Deploy commands', code: tanstackGithubCommands },
        ],
      },
    ],
  },
  {
    id: 'waku',
    name: 'Waku',
    summary:
      'Waku is an RSC framework with server adapters for Vercel, Netlify, and Cloudflare. A fully static build can be uploaded to GitHub Pages, but there is no SPA fallback.',
    support: {
      vercel: 'adapter',
      netlify: 'adapter',
      cloudflare: 'adapter',
      github: 'static',
    },
    recipes: [
      {
        platform: 'Vercel',
        support: 'adapter',
        summary:
          'Export the Vercel adapter from src/waku.server.tsx and deploy with the Vercel CLI. Do not add a static SPA rewrite.',
        files: [{ title: 'src/waku.server.tsx', code: wakuVercelConfig }],
      },
      {
        platform: 'Netlify',
        support: 'adapter',
        summary:
          'Use the Netlify adapter and set NETLIFY=1 during the build. Netlify publishes dist/public and deploys the generated function.',
        files: [
          { title: 'src/waku.server.tsx', code: wakuNetlifyConfig },
          { title: 'netlify.toml', code: wakuNetlifyToml },
        ],
      },
      {
        platform: 'Cloudflare',
        support: 'adapter',
        summary:
          'Use the Cloudflare adapter, build with CLOUDFLARE=1, and deploy the generated worker and static assets with Wrangler.',
        files: [
          { title: 'src/waku.server.tsx', code: wakuCloudflareConfig },
          { title: 'wrangler.jsonc', code: wakuCloudflareWrangler },
          {
            title: 'Deploy',
            code: `CLOUDFLARE=1 pnpm build
pnpm wrangler deploy`,
          },
        ],
      },
      {
        platform: 'GitHub Pages',
        support: 'static',
        summary:
          'Only fully static Waku output belongs on GitHub Pages. Set the Vite base for the repository subpath, publish dist/public, and omit any rewrite to index.html.',
        files: [
          { title: 'waku.config.ts', code: wakuGithubConfig },
          {
            title: 'Deploy',
            code: `pnpm build
touch dist/public/.nojekyll`,
          },
        ],
      },
    ],
  },
  {
    id: 'redwood-sdk',
    name: 'RedwoodSDK',
    summary:
      'RedwoodSDK targets Cloudflare Workers. There is no supported Vercel, Netlify, or GitHub Pages runtime for its React Server Components model.',
    support: {
      vercel: 'unsupported',
      netlify: 'unsupported',
      cloudflare: 'native',
      github: 'unsupported',
    },
    recipes: [
      {
        platform: 'Vercel',
        support: 'unsupported',
        summary:
          'Not supported. RedwoodSDK depends on the Cloudflare Workers runtime and request context; a static or Vercel server output is not a drop-in target.',
        files: [],
      },
      {
        platform: 'Netlify',
        support: 'unsupported',
        summary:
          'Not supported. Use Cloudflare Workers, or choose Next.js, Waku, or React Router if Netlify hosting is required.',
        files: [],
      },
      {
        platform: 'Cloudflare',
        support: 'native',
        summary:
          'Build and deploy with the RedwoodSDK release command. Wrangler reads the generated Worker config and static asset directory.',
        files: [
          { title: 'wrangler.jsonc', code: redwoodCloudflareWrangler },
          { title: 'Deploy', code: 'pnpm release' },
        ],
      },
      {
        platform: 'GitHub Pages',
        support: 'unsupported',
        summary:
          'Not supported. A static GitHub Pages host cannot run the RedwoodSDK Worker or its server components.',
        files: [],
      },
    ],
  },
  {
    id: 'gatsby',
    name: 'Gatsby',
    summary:
      'Gatsby emits static HTML into public. It works on all four hosts, but GitHub Pages needs pathPrefix and cannot provide isolation headers.',
    support: {
      vercel: 'static',
      netlify: 'static',
      cloudflare: 'static',
      github: 'static',
    },
    recipes: [
      {
        platform: 'Vercel',
        support: 'static',
        summary:
          'Use the Gatsby framework preset and add headers in vercel.json. Do not add a catch-all rewrite; Gatsby renders its own page HTML and 404 page.',
        files: [{ title: 'vercel.json', code: gatsbyVercelConfig }],
      },
      {
        platform: 'Netlify',
        support: 'static',
        summary:
          'Publish public and apply headers in netlify.toml. Netlify auto-detects Gatsby 5.12 and newer; no redirect is required.',
        files: [{ title: 'netlify.toml', code: gatsbyNetlifyConfig }],
      },
      {
        platform: 'Cloudflare',
        support: 'static',
        summary:
          'Upload public to Cloudflare Pages or serve it as Workers static assets. Add _headers for isolation and do not add an SPA redirect.',
        files: [{ title: 'public/_headers', code: gatsbyCloudflareConfig }],
      },
      {
        platform: 'GitHub Pages',
        support: 'static',
        summary:
          'Set pathPrefix, build with --prefix-paths, and publish public. Gatsby generates 404.html; GitHub Pages cannot set COOP or COEP.',
        files: [
          { title: 'gatsby-config.ts', code: gatsbyGithubConfig },
          { title: 'Deploy commands', code: gatsbyGithubCommands },
        ],
      },
    ],
  },
]
