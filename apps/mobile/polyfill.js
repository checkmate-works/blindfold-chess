// Polyfill for Hermes engine compatibility with Expo's winter runtime.
//
// Expo bundles WebIDL type-checking utilities that read property descriptors
// via Object.getOwnPropertyDescriptor(Proto, prop).get — this pattern assumes
// every built-in prototype property is an accessor (getter). Hermes implements
// some of these as internal/data properties, so the descriptor lookup returns
// undefined and .get throws.
//
// We patch each affected prototype property to be a proper accessor so the
// WebIDL code can extract the getter function it expects.

(function () {
  "use strict";

  // Helper: ensure `proto[prop]` is an accessor property with a getter.
  // If it already is one, this is a no-op.
  function ensureAccessor(proto, prop) {
    const desc = Object.getOwnPropertyDescriptor(proto, prop);
    // Already an accessor — nothing to do
    if (desc && typeof desc.get === "function") return;
    // Capture the current behavior (works for Hermes native props)
    const fallback = desc ? desc.value : undefined;
    Object.defineProperty(proto, prop, {
      get: function () {
        // For native built-in properties, `this[prop]` might still work
        // through the engine's internal slot access even after redefining
        // the prototype descriptor. If not, return the static fallback.
        try {
          // Access via a fresh descriptor on the instance
          const instanceDesc = Object.getOwnPropertyDescriptor(this, prop);
          if (instanceDesc && "value" in instanceDesc)
            return instanceDesc.value;
        } catch {
          // ignore
        }
        return typeof fallback === "function" ? fallback.call(this) : fallback;
      },
      configurable: true,
      enumerable: false,
    });
  }

  // --- ArrayBuffer.prototype patches ---
  ensureAccessor(ArrayBuffer.prototype, "byteLength");

  // `resizable` may not exist at all in Hermes — define a stub getter
  if (!Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "resizable")) {
    Object.defineProperty(ArrayBuffer.prototype, "resizable", {
      get: function () {
        return false;
      },
      configurable: true,
      enumerable: false,
    });
  } else {
    ensureAccessor(ArrayBuffer.prototype, "resizable");
  }

  // --- SharedArrayBuffer polyfill ---
  if (typeof global.SharedArrayBuffer === "undefined") {
    function SharedArrayBuffer(length) {
      if (!(this instanceof SharedArrayBuffer)) {
        throw new TypeError("Constructor SharedArrayBuffer requires 'new'");
      }
      this._buffer = new ArrayBuffer(length);
    }

    Object.defineProperty(SharedArrayBuffer.prototype, "byteLength", {
      get: function () {
        return this._buffer ? this._buffer.byteLength : 0;
      },
      configurable: true,
      enumerable: false,
    });

    Object.defineProperty(SharedArrayBuffer.prototype, "growable", {
      get: function () {
        return false;
      },
      configurable: true,
      enumerable: false,
    });

    SharedArrayBuffer.prototype.slice = function (begin, end) {
      const sliced = this._buffer.slice(begin, end);
      const result = new SharedArrayBuffer(sliced.byteLength);
      new Uint8Array(result._buffer).set(new Uint8Array(sliced));
      return result;
    };

    global.SharedArrayBuffer = SharedArrayBuffer;
  } else {
    ensureAccessor(SharedArrayBuffer.prototype, "byteLength");
    if (
      !Object.getOwnPropertyDescriptor(SharedArrayBuffer.prototype, "growable")
    ) {
      Object.defineProperty(SharedArrayBuffer.prototype, "growable", {
        get: function () {
          return false;
        },
        configurable: true,
        enumerable: false,
      });
    } else {
      ensureAccessor(SharedArrayBuffer.prototype, "growable");
    }
  }

  // --- DataView.prototype.byteLength ---
  ensureAccessor(DataView.prototype, "byteLength");

  // --- TypedArray.prototype[Symbol.toStringTag] ---
  const typedArrayProto = Object.getPrototypeOf(Uint8Array).prototype;
  if (typedArrayProto) {
    ensureAccessor(typedArrayProto, Symbol.toStringTag);
  }

  // --- Atomics ---
  if (typeof global.Atomics === "undefined") {
    global.Atomics = {};
  }
})();
