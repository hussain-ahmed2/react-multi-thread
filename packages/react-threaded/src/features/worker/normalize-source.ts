/**
 * Converts live functions into source strings that can be evaluated inside a
 * classic Web Worker.
 *
 * react-threaded uses an inline worker runtime (Blob URL) so consumers do not
 * need bundler-specific worker imports. The trade-off is that the worker
 * function must be self-contained: it cannot close over imports or local
 * variables from the module where it was declared.
 */

/** Any function that can be shipped to a worker. */
export type WorkerSourceFunction = (...args: never[]) => unknown

/**
 * Normalise a function's `toString()` into a valid function expression.
 *
 * Object-literal method shorthand (`fibonacci(n) { ... }`) is not a valid
 * expression on its own, so it is rewritten to `function fibonacci(n) { ... }`.
 */
export function toFunctionSource(fn: WorkerSourceFunction): string {
  const source = fn.toString().trim()

  if (source.includes('[native code]')) {
    throw new TypeError(
      'react-threaded cannot serialise bound or native functions. Use a plain function or arrow function instead.',
    )
  }

  if (source.startsWith('function') || source.startsWith('async function') || source.includes('=>')) {
    return source
  }

  // Method shorthand and class methods both stringify as `name(args) { ... }`.
  // Rebuild them as a function declaration expression.
  const methodMatch = /^(async\s+)?([A-Za-z_$][\w$]*)\s*\(/.exec(source)

  if (methodMatch !== null) {
    const asyncPrefix = methodMatch[1] ?? ''
    const name = methodMatch[2] ?? ''
    const remainder = source.slice(methodMatch[0].length - 1)

    return `${asyncPrefix}function ${name}${remainder}`
  }

  return source
}

/** Validate and stringify a record of worker methods. */
export function toMethodsSource(methods: Record<string, WorkerSourceFunction>): string {
  const entries = Object.entries(methods)

  if (entries.length === 0) {
    throw new TypeError('createWorker() requires at least one method when using the methods form')
  }

  const serialized = entries.map(([name, method]) => {
    if (typeof method !== 'function') {
      throw new TypeError(`Worker method "${name}" must be a function`)
    }

    return `${JSON.stringify(name)}: ${toFunctionSource(method)}`
  })

  return `{ ${serialized.join(', ')} }`
}
