/**
 * A deterministic in-process Worker used by the integration tests.
 *
 * It evaluates the exact runtime that ships to browsers, so the tests cover the
 * protocol, the task queue, progress events, methods, and cancellation without
 * needing a real browser.
 */

import type { AnyWorkerDefinition } from '../../src/features/worker/types'
import { createWorkerSource, getWorkerUrl } from '../../src/features/worker/worker-runtime'

type FakeWorkerMessageEvent = {
  readonly data: unknown
}

type FakeWorkerScope = {
  onmessage: ((event: FakeWorkerMessageEvent) => void) | null
  postMessage: (message: unknown, transfer?: Transferable[]) => void
}

const sourceByUrl = new Map<string, string>()

let originalWorker: unknown
let originalWorkerCaptured = false

/**
 * Register a definition with the fake worker.
 *
 * Definitions create their Blob URL lazily. Calling this helper forces URL
 * creation and records the generated source under that URL.
 */
export function registerDefinition(definition: AnyWorkerDefinition): void {
  const url = getWorkerUrl(definition)
  sourceByUrl.set(url, createWorkerSource(definition))
}

/** Install the fake Worker globally. Called automatically by test/setup.ts. */
export function installFakeWorker(): void {
  if (!originalWorkerCaptured) {
    originalWorker = Reflect.get(globalThis, 'Worker')
    originalWorkerCaptured = true
  }

  Object.defineProperty(globalThis, 'Worker', {
    configurable: true,
    writable: true,
    value: FakeWorker,
  })

  FakeWorker.instances.length = 0
}

/** Restore the original Worker global. */
export function uninstallFakeWorker(): void {
  Object.defineProperty(globalThis, 'Worker', {
    configurable: true,
    writable: true,
    value: originalWorker,
  })
}

/** In-process Worker replacement. */
export class FakeWorker {
  public static readonly instances: FakeWorker[] = []

  public onmessage: ((event: FakeWorkerMessageEvent) => void) | null = null
  public onerror: ((event: { readonly error?: unknown; readonly message?: string }) => void) | null =
    null
  public onmessageerror: (() => void) | null = null
  public terminated = false

  private readonly scope: FakeWorkerScope

  public constructor(url: string | URL, _options?: { readonly name?: string }) {
    const source = sourceByUrl.get(String(url))

    if (source === undefined) {
      throw new Error(`FakeWorker has no registered source for ${String(url)}`)
    }

    const scope: FakeWorkerScope = {
      onmessage: null,
      postMessage: (message: unknown, _transfer?: Transferable[]): void => {
        setTimeout(() => {
          if (!this.terminated) {
            this.onmessage?.({ data: message })
          }
        }, 0)
      },
    }

    this.scope = scope

    // The generated source declares `__reactThreadedHandlers` and then runs the
    // worker runtime. `self` is a parameter so the handler can close over it.
    new Function('self', source)(scope)

    FakeWorker.instances.push(this)
  }

  public postMessage(message: unknown, _transfer?: Transferable[]): void {
    setTimeout(() => {
      if (!this.terminated) {
        this.scope.onmessage?.({ data: message })
      }
    }, 0)
  }

  public terminate(): void {
    this.terminated = true
  }
}
