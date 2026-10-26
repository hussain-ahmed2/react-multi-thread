import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const crossOriginHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-threaded': fileURLToPath(
        new URL('../../packages/react-threaded/src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    headers: crossOriginHeaders,
  },
  preview: {
    headers: crossOriginHeaders,
  },
  build: {
    target: 'es2022',
  },
})
