import { describe, expect, it } from 'vitest'
import { collectTransferables } from '../../src/shared/transferables'

describe('collectTransferables', () => {
  it('collects typed-array buffers once, even when nested', () => {
    const buffer = new ArrayBuffer(16)
    const view = new Float64Array(buffer)
    const other = new ArrayBuffer(8)

    const result = collectTransferables({
      view,
      nested: [view, other],
      text: 'not transferable',
      count: 1,
    })

    expect(result).toHaveLength(2)
    expect(result).toContain(buffer)
    expect(result).toContain(other)
  })

  it('ignores SharedArrayBuffer values', () => {
    const shared = new SharedArrayBuffer(4)
    const view = new Int32Array(shared)

    expect(collectTransferables({ shared, view })).toHaveLength(0)
  })

  it('does not walk class instances', () => {
    class Holder {
      public constructor(public readonly buffer: ArrayBuffer) {}
    }

    expect(collectTransferables(new Holder(new ArrayBuffer(4)))).toHaveLength(0)
  })

  it('handles primitive and null roots', () => {
    expect(collectTransferables(null)).toHaveLength(0)
    expect(collectTransferables(42)).toHaveLength(0)
    expect(collectTransferables('text')).toHaveLength(0)
  })
})
