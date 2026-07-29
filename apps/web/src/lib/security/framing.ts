/**
 * Which paths this site permits other origins to put in an `<iframe>`.
 *
 * Everything is un-framable by default — the app has authenticated surfaces
 * with one-click destructive actions, so blanket framing is a clickjacking
 * hole. The one exception is the embed surface (`/embed/...`), whose whole
 * purpose is to be pasted into someone else's blog: a chrome-less, read-only,
 * cookie-independent replay of a *public* game. It renders no form, no
 * mutation control, and nothing that is not already visible to an anonymous
 * visitor, so there is no state a framing site could trick a viewer into
 * changing.
 *
 * Two independent headers enforce this and must agree:
 *
 * - `X-Frame-Options: DENY` — declared statically in `next.config.ts`, whose
 *   rule excludes this prefix. The header has no "allow any origin" value
 *   (`ALLOW-FROM` is dead and was never implemented by Chrome), so the embed
 *   path is covered by simply not emitting it there.
 * - `frame-ancestors` — built per-request in `./csp.ts` and stamped by
 *   `src/proxy.ts`, which passes {@link isFramablePath} for the request path.
 *
 * `next.config.ts` cannot import this module (its `source` patterns are
 * plain strings resolved before the app's module graph exists), so it repeats
 * the prefix as a literal. `framing.test.ts` asserts the two stay in sync.
 */

/** Top-level segment of the embed surface — see `src/app/embed`. */
export const EMBED_PATH_SEGMENT = 'embed';

const EMBED_PATH_PREFIX = `/${EMBED_PATH_SEGMENT}`;

/**
 * Whether other origins may frame `pathname`.
 *
 * Matches the embed root and anything beneath it, and nothing else — notably
 * NOT a sibling whose name merely starts with the same letters
 * (`/embedded-thing` is a normal page and stays un-framable).
 */
export function isFramablePath(pathname: string): boolean {
  return pathname === EMBED_PATH_PREFIX || pathname.startsWith(`${EMBED_PATH_PREFIX}/`);
}
