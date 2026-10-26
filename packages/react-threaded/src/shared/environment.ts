/**
 * Capability detection.
 *
 * Every function is SSR-safe: it only touches globals behind `typeof` checks so
 * importing react-threaded on the server never throws.
 */

const FALLBACK_POOL_SIZE = 4

/** Whether the current runtime can construct a DOM `Worker`. */
export function isWorkerSupported(): boolean {
  return typeof Worker !== 'undefined'
}

/**
 * Whether shared memory (`SharedArrayBuffer` + `Atomics`) is usable.
 *
 * Browsers gate `SharedArrayBuffer` behind cross-origin isolation. When the
 * flag is unavailable we assume the environment is not a browser and allow it;
 * otherwise it must be explicitly `true`.
 */
export function isSharedMemoryAvailable(): boolean {
  if (typeof SharedArrayBuffer === 'undefined') return false

  if (typeof crossOriginIsolated === 'undefined') return true

  return crossOriginIsolated === true
}

/** Whether cross-realm notifications via `BroadcastChannel` are available. */
export function isBroadcastChannelSupported(): boolean {
  return typeof BroadcastChannel !== 'undefined'
}

/** Logical CPU count, with a deterministic fallback for restricted contexts. */
export function getHardwareConcurrency(): number {
  const value = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : undefined

  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value)
  }

  return FALLBACK_POOL_SIZE
}

/**
 * Default pool size: leave one logical core for the UI thread.
 *
 * This is intentionally conservative. Consumers can always pass an explicit
 * size when they know their workload better.
 */
export function getDefaultPoolSize(): number {
  return Math.max(1, getHardwareConcurrency() - 1)
}
