/**
 * The worker-side runtime, shipped as a string and injected into a Blob URL.
 *
 * Why a string instead of a real module?
 * - Consumers do not need bundler-specific `new Worker(new URL(...))` syntax.
 * - The same runtime works in Vite, webpack, Next.js, and plain ES modules.
 * - The handler source is embedded directly, so the CSP does not need
 *   `unsafe-eval` (it still needs `worker-src blob:`).
 *
 * Protocol:
 *   main -> worker: { type: 'init', cancelBuffer: SharedArrayBuffer | null }
 *   worker -> main: { type: 'ready' }
 *   main -> worker: { type: 'invoke', id, method, args }
 *   main -> worker: { type: 'cancel', ids: number[] }
 *   worker -> main: { type: 'progress' | 'event' | 'result' | 'error', id, ... }
 *
 * Tasks are serialised by a promise chain. This keeps methods-style workers
 * predictable when callers fire several proxy calls concurrently.
 */
export const WORKER_RUNTIME_SOURCE = String.raw`
(function () {
  'use strict';

  var handlers = __reactThreadedHandlers;
  var cancelView = null;
  var cancelRequested = false;
  var cancelledIds = Object.create(null);
  var queue = Promise.resolve();
  var yieldChannel = null;
  var pendingYields = [];

  /**
   * Yield to the worker event loop with a macrotask. setTimeout(0) is clamped
   * to roughly 4ms in browsers, which adds up quickly for loops that yield
   * every few million iterations. A MessageChannel resolves on the next task
   * without that delay while still letting queued cancellation messages run.
   */
  function yieldToEventLoop() {
    return new Promise(function (resolve) {
      if (typeof MessageChannel !== 'function') {
        setTimeout(resolve, 0);
        return;
      }

      if (yieldChannel === null) {
        yieldChannel = new MessageChannel();
        yieldChannel.port1.onmessage = function () {
          var pending = pendingYields;
          pendingYields = [];

          for (var index = 0; index < pending.length; index++) {
            pending[index]();
          }
        };

        // Node keeps MessagePorts alive by default; browsers have no unref.
        var unrefPort = function (port) {
          if (port && typeof port.unref === 'function') port.unref();
        };
        unrefPort(yieldChannel.port1);
        unrefPort(yieldChannel.port2);
      }

      pendingYields.push(resolve);
      yieldChannel.port2.postMessage(null);
    });
  }

  function serializeError(error) {
    if (error && typeof error === 'object') {
      return {
        name: String(error.name || 'Error'),
        message: String(error.message || error),
        stack: error.stack ? String(error.stack) : undefined
      };
    }
    return { name: 'Error', message: String(error) };
  }

  function addTransferable(value, output, seen) {
    if (value === null || typeof value !== 'object') return;
    if (seen.has(value)) return;
    seen.add(value);
    output.push(value);
  }

  function collectTransferables(value) {
    var output = [];
    var seen = new Set();

    function visit(node) {
      if (node === null || typeof node !== 'object') return;
      if (seen.has(node)) return;

      if (ArrayBuffer.isView(node)) {
        var buffer = node.buffer;
        if (!(typeof SharedArrayBuffer !== 'undefined' && buffer instanceof SharedArrayBuffer)) {
          addTransferable(buffer, output, seen);
        }
        return;
      }

      if (node instanceof ArrayBuffer) {
        addTransferable(node, output, seen);
        return;
      }

      if (typeof MessagePort !== 'undefined' && node instanceof MessagePort) {
        addTransferable(node, output, seen);
        return;
      }

      if (typeof ImageBitmap !== 'undefined' && node instanceof ImageBitmap) {
        addTransferable(node, output, seen);
        return;
      }

      if (typeof OffscreenCanvas !== 'undefined' && node instanceof OffscreenCanvas) {
        addTransferable(node, output, seen);
        return;
      }

      if (Array.isArray(node)) {
        for (var i = 0; i < node.length; i++) visit(node[i]);
        return;
      }

      var prototype = Object.getPrototypeOf(node);
      if (prototype === Object.prototype || prototype === null) {
        var keys = Object.keys(node);
        for (var j = 0; j < keys.length; j++) visit(node[keys[j]]);
      }
    }

    visit(value);
    return output;
  }

  function createContext(id) {
    var context = {
      progress: function (value) {
        self.postMessage({ type: 'progress', id: id, value: value });
      },
      post: function (message, transfer) {
        self.postMessage({ type: 'event', id: id, message: message }, transfer || []);
      },
      yield: yieldToEventLoop
    };

    Object.defineProperty(context, 'cancelled', {
      enumerable: true,
      get: function () {
        if (cancelRequested) return true;
        if (cancelView) {
          try { return Atomics.load(cancelView, 0) === 1; } catch (error) { return false; }
        }
        return false;
      }
    });

    return context;
  }

  function resolveHandler(method) {
    if (typeof handlers === 'function') {
      return method === null ? handlers : null;
    }
    if (handlers && typeof handlers === 'object' && method !== null) {
      var candidate = handlers[method];
      return typeof candidate === 'function' ? candidate : null;
    }
    return null;
  }

  function runTask(message) {
    if (cancelledIds[message.id] === true) {
      delete cancelledIds[message.id];
      return Promise.resolve();
    }

    cancelRequested = false;
    if (cancelView) {
      try { Atomics.store(cancelView, 0, 0); } catch (error) { /* ignore */ }
    }

    var handler = resolveHandler(message.method);
    if (handler === null) {
      self.postMessage({
        type: 'error',
        id: message.id,
        error: serializeError(new Error('Unknown worker method: ' + String(message.method)))
      });
      return Promise.resolve();
    }

    var context = createContext(message.id);
    var args = (message.args || []).concat([context]);

    return Promise.resolve()
      .then(function () { return handler.apply(null, args); })
      .then(
        function (result) {
          try {
            self.postMessage(
              { type: 'result', id: message.id, value: result },
              collectTransferables(result)
            );
          } catch (error) {
            self.postMessage({ type: 'error', id: message.id, error: serializeError(error) });
          }
        },
        function (error) {
          self.postMessage({ type: 'error', id: message.id, error: serializeError(error) });
        }
      );
  }

  function enqueue(message) {
    queue = queue.then(
      function () { return runTask(message); },
      function () { return runTask(message); }
    );
  }

  self.onmessage = function (event) {
    var message = event.data;
    if (!message || typeof message !== 'object') return;

    if (message.type === 'init') {
      cancelView = message.cancelBuffer ? new Int32Array(message.cancelBuffer) : null;
      self.postMessage({ type: 'ready' });
      return;
    }

    if (message.type === 'invoke') {
      enqueue(message);
      return;
    }

    if (message.type === 'cancel') {
      cancelRequested = true;
      var ids = message.ids || [];
      for (var i = 0; i < ids.length; i++) cancelledIds[ids[i]] = true;
      if (cancelView) {
        try {
          Atomics.store(cancelView, 0, 1);
          Atomics.notify(cancelView, 0, 1);
        } catch (error) { /* ignore */ }
      }
    }
  };
})();
`
