/**
 * Sanitize a post-auth `next` redirect target, guarding against open redirects.
 *
 * A `next` value carried through the sign-in / sign-up flow (so a CTA-gated page
 * can return the user to where they were) is untrusted input. It is accepted
 * only when it is a same-origin absolute path — starts with `/` but not `//`
 * (browsers treat `//host` as protocol-relative → external). Anything else
 * (absolute URL, protocol-relative, empty) yields `null`, and callers fall back
 * to their default destination.
 */
export function sanitizeNext(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}
