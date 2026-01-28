console.log("[Mobile] Starting app initialization");
console.log("[Mobile] Checking for SharedArrayBuffer...");
if (typeof SharedArrayBuffer === "undefined") {
  console.log("[Mobile] SharedArrayBuffer is undefined, applying polyfill");
  global.SharedArrayBuffer = ArrayBuffer;
} else {
  console.log("[Mobile] SharedArrayBuffer is already defined");
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
require("expo-router/entry");
