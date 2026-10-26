/**
 * Shared-state feature public surface.
 */

export { createSharedAtom } from './shared-atom'
export { useSharedAtom } from './use-shared-atom'

export type {
  SharedAtom,
  SharedAtomBinding,
  SharedAtomListener,
  SharedAtomOptions,
  SharedAtomSetter,
  SharedAtomUpdater,
  UseSharedAtomConfig,
} from './types'
