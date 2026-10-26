/**
 * Shared-atom types.
 *
 * `SharedAtom` is intentionally numeric. Atomics only operate on integer typed
 * arrays, and hiding that constraint behind a generic JSON store would imply
 * guarantees the platform does not provide.
 */

/** Update function accepted by `atom.update()`. */
export type SharedAtomUpdater = (current: number) => number

/** Listener invoked when an atom's value changes. */
export type SharedAtomListener = (value: number) => void

/** Configuration for `createSharedAtom()`. */
export type SharedAtomOptions = {
  /** BroadcastChannel name. Defaults to a unique generated name. */
  readonly name?: string
  /** Force local (non-shared) mode. Defaults to capability detection. */
  readonly shared?: boolean
}

/** A reactive signed 32-bit integer shared through `SharedArrayBuffer`. */
export type SharedAtom = {
  readonly name: string
  /** Present only when shared memory is active. Pass this to workers. */
  readonly buffer: SharedArrayBuffer | null
  readonly isShared: boolean
  readonly get: () => number
  readonly set: (value: number) => number
  readonly update: (updater: SharedAtomUpdater) => number
  readonly subscribe: (listener: SharedAtomListener) => () => void
  readonly dispose: () => void
}

/** Setter returned by `useSharedAtom()`. */
export type SharedAtomSetter = (value: number | SharedAtomUpdater) => void

/** Tuple returned by `useSharedAtom()`. */
export type SharedAtomBinding = readonly [value: number, setValue: SharedAtomSetter]

/** Configuration for `useSharedAtom()`. */
export type UseSharedAtomConfig = {
  /** Poll interval for writes made directly through `Atomics`. Default: 100ms. */
  readonly pollMs?: number
}
