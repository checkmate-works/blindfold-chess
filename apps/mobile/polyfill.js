// Polyfill for SharedArrayBuffer if it's missing
if (typeof SharedArrayBuffer === "undefined") {
  global.SharedArrayBuffer = ArrayBuffer;
}
