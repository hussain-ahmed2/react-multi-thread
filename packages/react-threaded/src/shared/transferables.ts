/**
 * Transferable discovery for worker outputs.
 *
 * The worker runtime automatically transfers ownership of ArrayBuffers (and
 * other transferable values) found in the result. On the main thread we expose
 * the same traversal for callers that opt into `transfer: 'auto'` for inputs.
 *
 * Only plain objects and arrays are traversed. Class instances, Maps, and Sets
 * are deliberately ignored: walking arbitrary objects can execute getters or
 * accidentally detach buffers the caller still owns.
 */

/** Set-backed collector to keep duplicate buffers out of the transfer list. */
type TransferCollector = {
  readonly values: Transferable[]
  readonly seen: Set<unknown>
  readonly transferred: Set<unknown>
}

/** Recursively collect transferable values from a structured-cloneable tree. */
export function collectTransferables(value: unknown): Transferable[] {
  const collector: TransferCollector = {
    values: [],
    seen: new Set<unknown>(),
    transferred: new Set<unknown>(),
  }

  visitTransferables(value, collector)

  return collector.values
}

function visitTransferables(value: unknown, collector: TransferCollector): void {
  if (value === null || typeof value !== 'object') return
  if (collector.seen.has(value)) return

  collector.seen.add(value)

  if (ArrayBuffer.isView(value)) {
    addBuffer(value.buffer, collector)
    return
  }

  if (value instanceof ArrayBuffer) {
    addTransferable(value, collector)
    return
  }

  // Not all of these constructors exist in every runtime. Guard each one so
  // Node, jsdom, and older browsers all behave predictably.
  if (typeof MessagePort !== 'undefined' && value instanceof MessagePort) {
    addTransferable(value, collector)
    return
  }

  if (typeof ImageBitmap !== 'undefined' && value instanceof ImageBitmap) {
    addTransferable(value, collector)
    return
  }

  if (typeof OffscreenCanvas !== 'undefined' && value instanceof OffscreenCanvas) {
    addTransferable(value, collector)
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) visitTransferables(item, collector)
    return
  }

  if (isPlainObject(value)) {
    for (const item of Object.values(value)) visitTransferables(item, collector)
  }
}

function addBuffer(buffer: ArrayBufferLike, collector: TransferCollector): void {
  // SharedArrayBuffer is shared, not transferable. Pushing it would throw a
  // DataCloneError at postMessage time.
  if (typeof SharedArrayBuffer !== 'undefined' && buffer instanceof SharedArrayBuffer) return

  addTransferable(buffer as ArrayBuffer, collector)
}

function addTransferable(value: Transferable, collector: TransferCollector): void {
  if (collector.transferred.has(value)) return

  collector.transferred.add(value)
  collector.values.push(value)
}

function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value)

  return prototype === Object.prototype || prototype === null
}
