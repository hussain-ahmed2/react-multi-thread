/**
 * Cross-feature type primitives.
 *
 * Worker payloads and results must be structured-cloneable. The DOM types
 * already model that for us, so this module only adds small utilities that are
 * shared by several features.
 */

/** Minimal clock abstraction so core code runs in browsers, workers, and Node. */
export type Clock = {
  readonly now: () => number
}

export const systemClock: Clock = {
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
}
