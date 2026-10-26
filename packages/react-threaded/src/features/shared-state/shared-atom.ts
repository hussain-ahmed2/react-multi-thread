/**
 * Shared numeric atom backed by `SharedArrayBuffer` + `Atomics`.
 *
 * Workers receive `atom.buffer` in a task payload and can mutate it with
 * `Atomics.add` / `Atomics.compareExchange`. The main thread observes changes
 * through `Atomics.load`. A BroadcastChannel mirrors updates to other atoms
 * with the same name, and `useSharedAtom` polls for writes that bypass this
 * object (for example a worker calling `Atomics.add` directly).
 */

import { isBroadcastChannelSupported, isSharedMemoryAvailable } from '../../shared/environment'
import type {
  SharedAtom,
  SharedAtomListener,
  SharedAtomOptions,
  SharedAtomUpdater,
} from './types'

const INT32_MIN = -2_147_483_648
const INT32_MAX = 2_147_483_647

let atomCounter = 0

/** Create a numeric atom. Shared memory is used when available. */
export function createSharedAtom(initial = 0, options: SharedAtomOptions = {}): SharedAtom {
  const name = options.name ?? createAtomName()
  const useSharedMemory = options.shared ?? isSharedMemoryAvailable()

  const buffer = useSharedMemory ? new SharedArrayBuffer(4) : null
  const view = buffer !== null ? new Int32Array(buffer) : null

  let localValue = toInt32(initial)
  if (view !== null) {
    Atomics.store(view, 0, localValue)
  }

  const listeners = new Set<SharedAtomListener>()
  const channel = createChannel(name)

  let disposed = false

  const notify = (value: number): void => {
    for (const listener of [...listeners]) {
      listener(value)
    }
  }

  if (channel !== null) {
    channel.onmessage = (event: MessageEvent<unknown>): void => {
      if (typeof event.data !== 'number') return

      const value = toInt32(event.data)

      if (view !== null) {
        Atomics.store(view, 0, value)
      } else {
        localValue = value
      }

      // Do not re-broadcast incoming messages; that would loop between tabs.
      notify(value)
    }
  }

  const get = (): number => {
    if (view !== null) {
      return Atomics.load(view, 0)
    }

    return localValue
  }

  const write = (value: number): number => {
    assertActive(disposed)

    const next = toInt32(value)

    if (view !== null) {
      Atomics.store(view, 0, next)
      try {
        Atomics.notify(view, 0)
      } catch {
        // notify is best-effort; polling still observes the value.
      }
    } else {
      localValue = next
    }

    channel?.postMessage(next)
    notify(next)

    return next
  }

  return {
    name,
    buffer,
    isShared: view !== null,
    get,
    set: write,
    update(updater: SharedAtomUpdater): number {
      assertActive(disposed)

      if (view === null) {
        return write(updater(localValue))
      }

      let current = Atomics.load(view, 0)

      for (;;) {
        const next = toInt32(updater(current))
        const observed = Atomics.compareExchange(view, 0, current, next)

        if (observed === current) {
          try {
            Atomics.notify(view, 0)
          } catch {
            // See above.
          }

          channel?.postMessage(next)
          notify(next)

          return next
        }

        current = observed
      }
    },
    subscribe(listener: SharedAtomListener): () => void {
      listeners.add(listener)

      return (): void => {
        listeners.delete(listener)
      }
    },
    dispose(): void {
      if (disposed) return

      disposed = true
      listeners.clear()
      channel?.close()
    },
  }
}

function createAtomName(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `react-threaded:atom:${crypto.randomUUID()}`
  }

  atomCounter += 1

  return `react-threaded:atom:${Date.now().toString(36)}:${atomCounter}`
}

function createChannel(name: string): BroadcastChannel | null {
  if (!isBroadcastChannelSupported()) return null

  try {
    const channel = new BroadcastChannel(name)

    // Node keeps BroadcastChannel alive by default. Browsers do not have
    // `unref`, so this is a no-op there.
    const unref = (channel as unknown as { readonly unref?: () => void }).unref
    if (typeof unref === 'function') {
      unref.call(channel)
    }

    return channel
  } catch {
    return null
  }
}

function toInt32(value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError('SharedAtom values must be finite numbers')
  }

  const truncated = Math.trunc(value)

  if (truncated < INT32_MIN || truncated > INT32_MAX) {
    throw new RangeError('SharedAtom values must fit in a signed 32-bit integer')
  }

  return truncated
}

function assertActive(disposed: boolean): void {
  if (disposed) {
    throw new Error('This SharedAtom has been disposed')
  }
}
