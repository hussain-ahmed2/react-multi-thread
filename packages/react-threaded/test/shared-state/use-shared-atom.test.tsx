// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createSharedAtom } from '../../src/features/shared-state/shared-atom'
import { useSharedAtom } from '../../src/features/shared-state/use-shared-atom'

describe('useSharedAtom', () => {
  it('updates through the setter', () => {
    const atom = createSharedAtom(0, { shared: false })

    try {
      const { result } = renderHook(() => useSharedAtom(atom, { pollMs: 10 }))

      expect(result.current[0]).toBe(0)

      act(() => {
        result.current[1](5)
      })

      expect(result.current[0]).toBe(5)

      act(() => {
        result.current[1]((current) => current + 2)
      })

      expect(result.current[0]).toBe(7)
    } finally {
      atom.dispose()
    }
  })

  it('keeps the snapshot stable under rapid atomic writes', async () => {
    const atom = createSharedAtom(0, { shared: true })

    try {
      const buffer = atom.buffer

      if (buffer === null) {
        expect(atom.isShared).toBe(false)
        return
      }

      const view = new Int32Array(buffer)
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { result } = renderHook(() => useSharedAtom(atom, { pollMs: 5 }))

      act(() => {
        for (let index = 0; index < 10_000; index += 1) {
          Atomics.add(view, 0, 1)
        }
      })

      await waitFor(() => expect(result.current[0]).toBe(10_000))

      const snapshotWarnings = errorSpy.mock.calls
        .map((call) => String(call[0]))
        .filter((message) => message.includes('getSnapshot'))

      expect(snapshotWarnings).toEqual([])
    } finally {
      atom.dispose()
    }
  })

  it('observes direct Atomics writes', async () => {
    const atom = createSharedAtom(0, { shared: true })

    try {
      const buffer = atom.buffer

      if (buffer === null) {
        // Environments without SharedArrayBuffer exercise local mode in the
        // previous test; nothing else to assert here.
        expect(atom.isShared).toBe(false)
        return
      }

      const view = new Int32Array(buffer)
      const { result } = renderHook(() => useSharedAtom(atom, { pollMs: 5 }))

      act(() => {
        Atomics.add(view, 0, 3)
      })

      await waitFor(() => expect(result.current[0]).toBe(3))
    } finally {
      atom.dispose()
    }
  })
})
