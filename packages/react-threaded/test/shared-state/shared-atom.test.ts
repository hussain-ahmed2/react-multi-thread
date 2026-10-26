import { describe, expect, it } from 'vitest'
import { createSharedAtom } from '../../src/features/shared-state'

describe('createSharedAtom', () => {
  it('supports get/set/update/subscribe in local mode', () => {
    const atom = createSharedAtom(1, { shared: false })
    const seen: number[] = []
    const unsubscribe = atom.subscribe((value) => seen.push(value))

    expect(atom.isShared).toBe(false)
    expect(atom.buffer).toBeNull()
    expect(atom.get()).toBe(1)
    expect(atom.set(2)).toBe(2)
    expect(atom.update((value) => value + 3)).toBe(5)
    expect(seen).toEqual([2, 5])

    unsubscribe()
    atom.set(6)
    expect(seen).toEqual([2, 5])

    atom.dispose()
  })

  it('exposes a SharedArrayBuffer that workers can mutate with Atomics', () => {
    const atom = createSharedAtom(0, { shared: true })

    try {
      expect(atom.isShared).toBe(true)
      expect(atom.buffer).not.toBeNull()

      const view = new Int32Array(atom.buffer as SharedArrayBuffer)
      Atomics.add(view, 0, 7)

      expect(atom.get()).toBe(7)
    } finally {
      atom.dispose()
    }
  })

  it('broadcasts updates to atoms with the same name', async () => {
    const name = `react-threaded-test-${Date.now()}-${Math.random()}`
    const writer = createSharedAtom(0, { name })
    const reader = createSharedAtom(0, { name })

    try {
      const received = new Promise<number>((resolve) => {
        const unsubscribe = reader.subscribe((value) => {
          if (value !== 9) return

          unsubscribe()
          resolve(value)
        })
      })

      writer.set(9)

      await expect(received).resolves.toBe(9)
    } finally {
      writer.dispose()
      reader.dispose()
    }
  })

  it('rejects non-indices and values outside int32', () => {
    const atom = createSharedAtom(0, { shared: false })

    try {
      expect(() => atom.set(Number.NaN)).toThrow(RangeError)
      expect(() => atom.set(Number.POSITIVE_INFINITY)).toThrow(RangeError)
      expect(() => atom.set(2_147_483_648)).toThrow(RangeError)
    } finally {
      atom.dispose()
    }
  })

  it('rejects writes after dispose', () => {
    const atom = createSharedAtom(0, { shared: false })
    atom.dispose()

    expect(() => atom.set(1)).toThrow(/disposed/)
  })
})
