export const installCode = `pnpm add react-threaded
# or
npm install react-threaded`

export const firstWorkerCode = `import { createWorker, useWorker } from 'react-threaded'

// The function runs inside a Blob worker. Keep it self-contained:
// no imports, no closures over module state.
const fib = createWorker((n: number) => {
  let a = 0n
  let b = 1n
  for (let i = 0; i < n; i += 1) [a, b] = [b, a + b]
  return a.toString()
})

export function Fibonacci() {
  const worker = useWorker(fib)

  return (
    <button onClick={() => worker.run(50_000)} disabled={worker.status === 'running'}>
      {worker.status === 'running' ? 'Computing…' : 'Compute'}
    </button>
  )
}`

export const progressCode = `const primeWorker = createWorker(async (limit: number, ctx) => {
  const composite = new Uint8Array(limit + 1)
  let count = 0

  for (let value = 2; value <= limit; value += 1) {
    if (composite[value] === 0) {
      count += 1
      for (let m = value * value; m <= limit; m += value) composite[m] = 1
    }

    if (value % 1_000_000 === 0) {
      ctx.progress(value / limit)
      if (ctx.cancelled) return { count, cancelled: true }
      await ctx.yield()
    }
  }

  return { count, cancelled: false }
})

const worker = useWorker(primeWorker)

// Hard cancel: terminates the worker and respawns it on the next run.
worker.cancel({ mode: 'terminate' })

// Cooperative cancel: the task decides where to stop.
worker.cancel({ mode: 'cooperative' })`

export const proxyCode = `const math = createWorker({
  fibonacci(n: number) {
    let a = 0n
    let b = 1n
    for (let i = 0; i < n; i += 1) [a, b] = [b, a + b]
    return a.toString()
  },

  hash(text: string) { /* ... */ },

  stats(values: readonly number[]) { /* ... */ },
})

const api = useWorkerProxy(math)

const digits = await api.fibonacci(50_000)
const hex = await api.hash('hello')`

export const poolCode = `const pool = useWorkerPool(crunchWorker, { size: 4 })

const results = await pool.map(
  Array.from({ length: 16 }, (_, id) => ({
    id,
    iterations: 25_000_000,
  })),
)

console.log(pool.stats)
// { size: 4, active: 4, queued: 8, completed: 0, ... }`

export const sharedAtomCode = `const counter = createSharedAtom(0, { name: 'total' })

// Pass the buffer to workers; it is not copied.
const output = await pool.run({
  buffer: counter.buffer,
  iterations: 5_000_000,
  workerId: 0,
})

// Inside the worker: a hardware atomic.
Atomics.add(new Int32Array(input.buffer), 0, 1)

// In React: poll for cross-thread writes.
const [value, setValue] = useSharedAtom(counter, { pollMs: 50 })`

export const viteHeadersCode = `// vite.config.ts
const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig({
  server: { headers: crossOriginIsolation },
  preview: { headers: crossOriginIsolation },
})`

export const nextConfigCode = `// next.config.ts
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

export const nextClientCode = `'use client'

import { createWorker, useWorker } from 'react-threaded'

const hash = createWorker(async (text: string) => {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
})

export function HashButton({ text }: { readonly text: string }) {
  const worker = useWorker(hash)

  return (
    <button type="button" onClick={() => worker.run(text)}>
      {worker.status === 'running' ? 'Hashing…' : 'Hash'}
    </button>
  )
}`

export const astroIslandCode = `---
// src/components/HashButton.tsx stays a normal React component.
---

<HashButton client:load text="react-threaded" />`

export const astroConfigCode = `// astro.config.mjs
import react from '@astrojs/react'
import { defineConfig } from 'astro/config'

export default defineConfig({
  integrations: [react()],
  vite: {
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
  },
})`

export const vercelConfigCode = `{
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

export const netlifyConfigCode = `# netlify.toml (static SPA output)
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

export const cloudflareHeadersCode = `# public/_headers
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp`

export const githubWorkflowCode = `# .github/workflows/deploy-pages.yml
name: Deploy demo to GitHub Pages

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
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm verify
        env:
          DEMO_BASE: /\${{ github.event.repository.name }}/
      - run: |
          cp apps/demo/dist/index.html apps/demo/dist/404.html
          touch apps/demo/dist/.nojekyll
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: apps/demo/dist

  deploy:
    runs-on: ubuntu-latest
    needs: build
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment`
