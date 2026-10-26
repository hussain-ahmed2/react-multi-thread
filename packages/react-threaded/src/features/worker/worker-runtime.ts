/**
 * Runtime URL construction.
 *
 * A definition's handler source is embedded into the worker script itself. The
 * resulting Blob URL is cached per definition so a pool of eight workers only
 * creates one Blob.
 */

import { WorkerUnsupportedError } from '../../shared/errors'
import type { AnyWorkerDefinition } from './types'
import { WORKER_RUNTIME_SOURCE } from './worker-runtime-source'

const workerUrls = new WeakMap<object, string>()

/** Build the complete JavaScript source for a definition. */
export function createWorkerSource(definition: AnyWorkerDefinition): string {
  // `definition.source` is a function expression or an object literal. Wrapping
  // it in parentheses makes both forms valid right-hand sides.
  return `var __reactThreadedHandlers = (${definition.source});\n${WORKER_RUNTIME_SOURCE}`
}

/** Return (and cache) a Blob URL for a definition. */
export function getWorkerUrl(definition: AnyWorkerDefinition): string {
  const cached = workerUrls.get(definition)
  if (cached !== undefined) return cached

  if (
    typeof Blob === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    throw new WorkerUnsupportedError(
      'react-threaded requires Blob and URL.createObjectURL to create workers',
    )
  }

  const blob = new Blob([createWorkerSource(definition)], { type: 'text/javascript' })
  const url = URL.createObjectURL(blob)
  workerUrls.set(definition, url)

  return url
}
