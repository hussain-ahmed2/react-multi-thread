# react-threaded monorepo

[![Deploy demo to GitHub Pages](https://github.com/hussain-ahmed2/react-threaded/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/hussain-ahmed2/react-threaded/actions/workflows/deploy-pages.yml)

Typed Web Workers for React: hooks, cancellable tasks, worker pools, shared atomics, plugins, and Comlink-style proxies.

- **Live demo:** [https://hussain-ahmed2.github.io/react-threaded/](https://hussain-ahmed2.github.io/react-threaded/)
- **Documentation:** [https://hussain-ahmed2.github.io/react-threaded/docs](https://hussain-ahmed2.github.io/react-threaded/docs)

This repository contains the published library and a live demo site that exercises the real package source.

| Path | Description |
| --- | --- |
| [`packages/react-threaded`](./packages/react-threaded) | The `react-threaded` npm package. ESM + CJS + type declarations. |
| [`apps/demo`](./apps/demo) | Vite + React playground, documentation, and seven working demos. |
| [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) | GitHub Pages build, verification, and deployment. |

## Live demo notes

The Pages deployment is served from `/react-threaded/`. GitHub Pages cannot set custom response
headers, so `SharedArrayBuffer` is unavailable there and the shared-atomics demo uses its local
fallback. Every other feature works normally.

For full cross-origin isolation (`crossOriginIsolated === true`) and real shared memory, deploy the
demo to Netlify, Vercel, or Cloudflare Pages with the COOP/COEP headers documented in the demo.

## Requirements

- Node.js 22.13+
- pnpm 11 (`corepack enable` will pick up the pinned `packageManager`)

## Getting started

```bash
pnpm install
pnpm dev
```

The demo runs at `http://localhost:5173`.

## Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the demo dev server. |
| `pnpm build` | Build the library with tsup (ESM, CJS, DTS). |
| `pnpm build:demo` | Typecheck and build the demo. |
| `pnpm preview:demo` | Preview the production demo build. |
| `pnpm test` | Run the library test suite (45 tests). |
| `pnpm test:coverage` | Run tests with V8 coverage. |
| `pnpm typecheck` | Typecheck every workspace package. |
| `pnpm verify` | Typecheck, test, build the library, and build the demo. |
| `pnpm publish:lib` | Publish `packages/react-threaded` to npm. |

## Library

```tsx
import { createWorker, useWorker } from 'react-threaded'

const double = createWorker((n: number) => n * 2)

function Counter() {
  const worker = useWorker(double)

  return (
    <button onClick={() => void worker.run(21)}>
      {worker.result ?? 'Run'}
    </button>
  )
}
```

Read the full API, configuration reference, and publishing guide in
[`packages/react-threaded/README.md`](./packages/react-threaded/README.md).

## Demo

The playground covers:

- a canvas boid swarm with O(n²) neighbor calculations
- cancellation with termination and cooperative checks
- zero-copy transferables
- bounded worker pools with live stats
- `SharedArrayBuffer` + `Atomics` counters
- Comlink-style method proxies
- retry policies and lifecycle plugins

The Vite config sets the cross-origin isolation headers required for
`SharedArrayBuffer`. Apply the same headers in production:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## Documentation

The live docs include the execution model, the full API, deployment guidance, troubleshooting, and
framework recipes for:

- React + Vite
- Next.js App Router
- React Router
- Astro
- TanStack Start
- Waku
- RedwoodSDK
- Gatsby

The demo also includes light and dark forest-green themes, responsive docs navigation, and a
persistent theme preference.

## GitHub Pages deployment

The workflow at
[`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) runs on every push to
`main`, verifies the workspace, builds the demo with `DEMO_BASE=/react-threaded/`, generates the
route shells and sitemap, and deploys the artifact.

Before the first run, open **Settings → Pages** in the GitHub repository and set the source to
**GitHub Actions**. The workflow can then publish to:

`https://hussain-ahmed2.github.io/react-threaded/`

Local production previews do not use the repository base:

```bash
pnpm build:demo
pnpm preview:demo
```

To reproduce the Pages build locally:

```bash
DEMO_BASE=/react-threaded/ pnpm build:demo
```

The build writes per-route HTML shells, `404.html`, `sitemap.xml`, and the static SEO files. It also
ships `llms.txt` and `llms-full.txt` for LLM tooling.

## Publishing

```bash
pnpm --filter react-threaded typecheck
pnpm --filter react-threaded test
pnpm --filter react-threaded build
pnpm publish:lib
```

`prepublishOnly` runs typecheck, tests, and build again. The package is configured
for public publishing with npm provenance, which requires a CI provider that
supports OIDC (for example GitHub Actions with `id-token: write`).

Inspect the tarball before publishing:

```bash
cd packages/react-threaded
npm pack --dry-run
```

## License

MIT
