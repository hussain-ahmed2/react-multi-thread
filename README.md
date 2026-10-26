# react-threaded monorepo

Typed Web Workers for React: hooks, cancellable tasks, worker pools, shared atomics, plugins, and Comlink-style proxies.

This repository contains the published library and a live demo site that exercises the real package source.

| Path | Description |
| --- | --- |
| [`packages/react-threaded`](./packages/react-threaded) | The `react-threaded` npm package. ESM + CJS + type declarations. |
| [`apps/demo`](./apps/demo) | Vite + React playground with six working demos. |

## Requirements

- Node.js 20+
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
| `pnpm test` | Run the library test suite (40 tests). |
| `pnpm test:coverage` | Run tests with V8 coverage. |
| `pnpm typecheck` | Typecheck every workspace package. |
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
