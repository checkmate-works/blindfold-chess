// Polyfill SharedArrayBuffer to avoid crash in Remote Debugging or missing headers
if (typeof SharedArrayBuffer === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).SharedArrayBuffer = ArrayBuffer;
}

import { registerRootComponent } from "expo";

import App from "./App";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
