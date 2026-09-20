import { IS_LOCAL_DEV } from '@/config';

/**
 * Client-read cookie holding the visitor's analytics-consent decision.
 *
 * @design
 * Why a cookie the server never reads while rendering: a `cookies()` read
 * during page rendering opts the whole page out of static generation, and the
 * consent banner is mounted in the root layout of every route. The decision
 * therefore lives entirely on the client — written here, reflected onto
 * `<html data-consent>` by the no-flash bootstrap script, and read back by
 * `GoogleScripts` to decide whether Google Analytics may load at all. Nothing
 * on the server needs to know, because there is no server-side consent record
 * to keep: the site runs GA4 only, and for GA4 alone "do not load the script
 * until the visitor says yes" is the entire obligation.
 *
 * Flow:
 *   1. No cookie = no answer yet. The banner shows; GA does not load.
 *   2. The banner's buttons write `granted` / `denied` and set the attribute
 *      in the same click, so GA mounts without a reload.
 *   3. On every later load the bootstrap script in `<head>` reads the cookie
 *      and sets the attribute before first paint, which both hides the banner
 *      (via the inline CSS rule in the layout) and lets GA mount.
 *
 * `denied` and "no answer" are deliberately different states: the first hides
 * the banner, the second shows it. Erasing the cookie is therefore how the
 * footer's "Cookie settings" link brings the banner back.
 */
export const CONSENT_COOKIE_NAME = 'bfc_consent';

/** The `<html>` attribute the bootstrap script and the banner keep in sync. */
export const CONSENT_ATTRIBUTE = 'data-consent';

/**
 * Schema version prefixed to the cookie value (`1:granted`).
 *
 * A stored decision is only as good as the question it answered. When the
 * banner's wording changes, or when consent starts covering something it did
 * not cover before, every existing decision has to be re-asked — bumping this
 * number does exactly that, because a value carrying any other version parses
 * as "no answer yet" and the banner comes back for everyone. Without the
 * prefix the only way to re-ask would be to rename the cookie and leave the
 * old one to expire in visitors' browsers.
 */
export const CONSENT_SCHEMA_VERSION = '1';

/**
 * Six months. Long enough that a regular visitor is not re-asked every season,
 * short enough that a decision is periodically refreshed — the range
 * supervisory authorities describe as customary for consent lifetime.
 */
export const CONSENT_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 183;

/** What the visitor chose. Absence of a cookie is neither of these. */
export type ConsentDecision = 'granted' | 'denied';

const DECISIONS: readonly string[] = ['granted', 'denied'];

/** Serialize a decision for storage: `"<version>:<decision>"`. */
export function consentCookieValue(decision: ConsentDecision): string {
  return `${CONSENT_SCHEMA_VERSION}:${decision}`;
}

/**
 * Parse a stored cookie value. Returns `null` — "no answer yet" — for anything
 * that is not a decision recorded under the current schema version, which
 * covers a bumped version, a truncated value, and a hand-edited cookie alike.
 */
export function parseConsentCookieValue(raw: string | undefined | null): ConsentDecision | null {
  if (!raw) return null;
  const [version, decision] = raw.split(':');
  if (version !== CONSENT_SCHEMA_VERSION) return null;
  return DECISIONS.includes(decision) ? (decision as ConsentDecision) : null;
}

/**
 * Read the decision out of a `document.cookie`-style string. Used by the
 * client-side helpers; the `<head>` bootstrap script re-implements the same
 * match inline because it must not import anything.
 */
export function readConsentDecision(cookieString: string): ConsentDecision | null {
  const match = cookieString.match(new RegExp(`(?:^|; )${CONSENT_COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  try {
    return parseConsentCookieValue(decodeURIComponent(match[1]));
  } catch {
    // A malformed percent-escape throws out of decodeURIComponent. Treat a
    // cookie we cannot read as one that is not there.
    return null;
  }
}

export type ConsentCookieOptions = {
  path: string;
  maxAge: number;
  sameSite: 'lax';
  secure: boolean;
  httpOnly: false;
};

/**
 * Cookie options for `bfc_consent`.
 *
 * - `httpOnly: false` — the banner writes it and the bootstrap script reads
 *   it; no server code touches it at all.
 * - `sameSite: 'lax'` — the decision should survive a top-level navigation
 *   back to the site (an OAuth redirect, a link from an email) but has no
 *   business travelling with a cross-site iframe.
 * - `secure` — true in production, false in local dev over plain http, where
 *   the browser would otherwise drop the write and the banner would reappear
 *   on every page load.
 */
export function consentCookieOptions(): ConsentCookieOptions {
  return {
    path: '/',
    maxAge: CONSENT_COOKIE_MAX_AGE_SEC,
    sameSite: 'lax',
    secure: !IS_LOCAL_DEV,
    httpOnly: false,
  };
}

/**
 * The exact string to assign to `document.cookie` to record a decision.
 *
 * Built from {@link consentCookieOptions} rather than written out again, so
 * the attributes stay in one place even though nothing on the server ever
 * sets this cookie. `httpOnly` has no `document.cookie` spelling — a cookie
 * written from script is never httpOnly — which is why the option is pinned
 * to `false` above: the two representations agree by construction.
 */
export function consentCookieAssignment(decision: ConsentDecision): string {
  const { path, maxAge, sameSite, secure } = consentCookieOptions();
  return (
    `${CONSENT_COOKIE_NAME}=${consentCookieValue(decision)}` +
    `; path=${path}; max-age=${maxAge}; SameSite=${sameSite === 'lax' ? 'Lax' : sameSite}` +
    (secure ? '; Secure' : '')
  );
}

/**
 * The assignment that erases the cookie, returning the visitor to "no answer
 * yet" so the banner shows again. `path` must match the one the cookie was
 * written with or the browser expires a different cookie and keeps this one.
 */
export function consentCookieErasure(): string {
  return `${CONSENT_COOKIE_NAME}=; path=${consentCookieOptions().path}; max-age=0`;
}
