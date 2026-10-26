import { describe, expect, it } from 'vitest'
import { createWorker } from '../../src/features/worker/create-worker'
import { createWorkerSource } from '../../src/features/worker/worker-runtime'
import {
  toFunctionSource,
  toMethodsSource,
  type WorkerSourceFunction,
} from '../../src/features/worker/normalize-source'

describe('toFunctionSource', () => {
  it('keeps function declarations and arrows intact', () => {
    const declaration = function add(a: number, b: number): number {
      return a + b
    }
    const arrow = (value: number): number => value * 2

    expect(toFunctionSource(declaration)).toContain('function add')
    expect(toFunctionSource(arrow)).toContain('=>')
  })

  it('rewrites method shorthand into a function expression', () => {
    const methods = {
      add(a: number, b: number): number {
        return a + b
      },
      async wait(ms: number): Promise<number> {
        return ms
      },
    }

    const source = toMethodsSource(methods)

    expect(source).toContain('"add": function add')
    expect(source).toContain('"wait": async function wait')
  })

  it('rejects empty method maps', () => {
    expect(() => toMethodsSource({})).toThrow(TypeError)
  })

  it('rejects non-function methods', () => {
    const invalid = { nope: 1 } as unknown as Record<string, WorkerSourceFunction>

    expect(() => toMethodsSource(invalid)).toThrow(TypeError)
  })

  it('rejects bound/native functions with a helpful error', () => {
    const bound = function boundFunction(): number {
      return 1
    }.bind(null)

    expect(() => toFunctionSource(bound)).toThrow(/native functions/)
  })
})

describe('createWorkerSource', () => {
  it('embeds the handler and the worker runtime', () => {
    const definition = createWorker((value: number) => value + 1)
    const source = createWorkerSource(definition)

    expect(source).toContain('var __reactThreadedHandlers')
    expect(source).toContain('self.onmessage')
    expect(source).toContain('value + 1')
  })
})
