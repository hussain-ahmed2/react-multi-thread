/**
 * Global test setup.
 *
 * We replace `URL.createObjectURL` with a deterministic stub because jsdom does
 * not implement it. The fake Worker ignores the URL, but the handle still needs
 * a string to spawn.
 */

import { afterAll, beforeEach } from 'vitest'
import { installFakeWorker, uninstallFakeWorker } from './helpers/fake-worker'

let objectUrlCounter = 0

Object.defineProperty(URL, 'createObjectURL', {
  configurable: true,
  writable: true,
  value: (): string => {
    objectUrlCounter += 1
    return `blob:react-threaded-test-${objectUrlCounter}`
  },
})

Object.defineProperty(URL, 'revokeObjectURL', {
  configurable: true,
  writable: true,
  value: (): void => {
    // No-op for tests.
  },
})

beforeEach(() => {
  installFakeWorker()
})

afterAll(() => {
  uninstallFakeWorker()
})
