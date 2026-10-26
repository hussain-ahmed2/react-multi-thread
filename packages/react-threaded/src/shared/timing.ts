/** Timing helpers used by retries, timeouts, and task metadata. */

import { CancelledError } from './errors'

/** Abort-aware delay used between retry attempts. */
export function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (milliseconds <= 0) {
    if (signal?.aborted === true) return Promise.reject(new CancelledError('Aborted before retry'))
    return Promise.resolve()
  }

  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted === true) {
      reject(new CancelledError('Aborted before retry'))
      return
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort)
      resolve()
    }, milliseconds)

    function handleAbort(): void {
      clearTimeout(timer)
      signal?.removeEventListener('abort', handleAbort)
      reject(new CancelledError('Aborted during retry delay'))
    }

    signal?.addEventListener('abort', handleAbort, { once: true })
  })
}

/** Clamp a user-provided retry config into something safe to execute. */
export function normalizeAttempts(attempts: number): number {
  if (!Number.isFinite(attempts)) return 1

  return Math.max(1, Math.floor(attempts))
}
