/**
 * React binding for `SharedAtom`.
 *
 * `useSyncExternalStore` gives us tearing-free reads. The subscription polls
 * `Atomics.load` because a worker can mutate the buffer without going through
 * the atom object; BroadcastChannel handles changes made by `atom.set()` in
 * another tab immediately.
 *
 * The snapshot is cached on purpose: workers can mutate the atom thousands of
 * times per second, and returning a fresh `Atomics.load` on every render would
 * make React observe a different value each time it checks. The cache advances
 * only when the subscription observes a change.
 */

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type {
  SharedAtom,
  SharedAtomBinding,
  SharedAtomUpdater,
  UseSharedAtomConfig,
} from './types'

const DEFAULT_POLL_MS = 100

/** Mutable snapshot shared by the subscribe and read callbacks. */
type SnapshotCache = {
  readonly get: () => number
  readonly set: (value: number) => void
}

/** Subscribe a component to a shared atom. */
export function useSharedAtom(
  atom: SharedAtom,
  config: UseSharedAtomConfig = {},
): SharedAtomBinding {
  const pollMs = config.pollMs ?? DEFAULT_POLL_MS

  const cache = useMemo<SnapshotCache>(() => {
    let value = atom.get()

    return {
      get: (): number => value,
      set: (next: number): void => {
        value = next
      },
    }
  }, [atom])

  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      let lastValue = cache.get()

      const handleValue = (value: number): void => {
        if (value === lastValue) return

        lastValue = value
        cache.set(value)
        onStoreChange()
      }

      const unsubscribe = atom.subscribe(handleValue)

      // Catch a write that landed between the render and this effect.
      handleValue(atom.get())

      const timer = setInterval(() => {
        handleValue(atom.get())
      }, pollMs)

      return (): void => {
        unsubscribe()
        clearInterval(timer)
      }
    },
    [atom, pollMs, cache],
  )

  const value = useSyncExternalStore(subscribe, cache.get, cache.get)

  const setValue = useCallback(
    (next: number | SharedAtomUpdater): void => {
      if (typeof next === 'function') {
        atom.update(next)
        return
      }

      atom.set(next)
    },
    [atom],
  )

  return [value, setValue]
}
