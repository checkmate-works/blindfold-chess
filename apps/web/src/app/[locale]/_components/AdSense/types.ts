export {};

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}
