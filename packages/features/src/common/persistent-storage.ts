/**
 * Minimal storage adapter interface that `usePersistentSettings` depends on.
 *
 * Both `get` and `set` may be synchronous or asynchronous — web wraps
 * `localStorage` (sync) and mobile wraps `AsyncStorage` (async), but from the
 * hook's perspective they're uniformly awaited so the `isLoaded` signal is
 * meaningful in both cases.
 *
 * Adapters are expected to:
 * - Return `null` when the key is absent (not throw).
 * - Be SSR-safe where applicable: web's `localStorage` adapter must no-op
 *   on the server (no `window`), returning `null` from `get`.
 * - Never throw on storage-quota errors in `set`; swallow or surface via a
 *   rejected Promise so the hook can keep state in sync even if persistence
 *   fails.
 */
export interface PersistentStorage {
  get(key: string): string | null | Promise<string | null>;
  set(key: string, value: string): void | Promise<void>;
}
