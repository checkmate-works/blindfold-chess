import { cookies } from 'next/headers';

import 'server-only';

/**
 * Read a preference-hint cookie from the current request and run it through
 * the module's defensive parser (which must map `null`/malformed input to its
 * default).
 *
 * @design Calling this is an explicit opt-out from ISR — the cookie is a
 * per-user hint, so any page that reads it must be dynamic. See
 * `apps/web/src/lib/isr-user-scope-guard.test.ts` for the repo-wide rule.
 */
export async function readPreferenceCookie<T>(
  name: string,
  parse: (raw: string | null) => T
): Promise<T> {
  const store = await cookies();
  const raw = store.get(name)?.value ?? null;
  return parse(raw);
}
