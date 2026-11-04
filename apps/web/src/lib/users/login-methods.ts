import type { LinkedIdentity, LoginMethods } from '@blindfold-chess/features/account';
import { isKnownAuthProvider } from '@blindfold-chess/features/account';
import { sql } from 'drizzle-orm';
import 'server-only';
import { z } from 'zod';

import { db } from '@/lib/db';
import { captureError } from '@/lib/sentry/capture-error';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * What the account page shows about how the user signs in: the
 * {@link LoginMethods} the unlink guard reasons about, plus the account's
 * email address and a pending email change.
 */
export interface AccountLoginState extends LoginMethods {
  readonly email: string | undefined;
  /**
   * The new address of an email change that has been started but not yet
   * confirmed on both sides. Cleared once the links in both confirmation
   * emails (old address and new address) have been opened.
   */
  readonly pendingEmail: string | undefined;
}

const identityRowSchema = z.object({
  id: z.string(),
  provider: z.string(),
  email: z.string().nullable(),
});

const loginStateRowSchema = z.object({
  email: z.string().nullable(),
  has_password: z.boolean(),
  pending_email: z.string().nullable(),
  identities: z.array(identityRowSchema),
});

/**
 * Read the account's login state straight from the auth schema.
 *
 * `auth.users` and `auth.identities` are read directly because two of the
 * facts are not exposed by the Supabase Auth API: whether a password is set
 * (`encrypted_password`) and the address of a pending email change
 * (`email_change`). Identities come back in creation order so the list is
 * stable across renders.
 *
 * Identities of a provider the app does not know (one enabled on the
 * Dashboard before the app learned its name) are dropped: there is no
 * dictionary entry for them and the unlink guard cannot reason about them.
 */
export async function getAccountLoginState(userId: string): Promise<AccountLoginState> {
  const rows = await db.execute(sql`
    select
      u.email,
      coalesce(u.encrypted_password, '') <> '' as has_password,
      nullif(u.email_change, '') as pending_email,
      coalesce(
        (
          select json_agg(
            json_build_object(
              'id', i.id,
              'provider', i.provider,
              'email', i.identity_data ->> 'email'
            )
            order by i.created_at
          )
          from auth.identities i
          where i.user_id = u.id
        ),
        '[]'::json
      ) as identities
    from auth.users u
    where u.id = ${userId}
  `);
  const row = loginStateRowSchema.parse(rows[0]);
  const identities: LinkedIdentity[] = [];
  for (const identity of row.identities) {
    if (!isKnownAuthProvider(identity.provider)) continue;
    identities.push({
      id: identity.id,
      provider: identity.provider,
      email: identity.email ?? undefined,
    });
  }
  return {
    email: row.email ?? undefined,
    hasPassword: row.has_password,
    pendingEmail: row.pending_email ?? undefined,
    identities,
  };
}

/**
 * Give a password user the `email` identity Supabase Auth did not create.
 *
 * A user who signed up with Google and later sets a password can sign in
 * with that password, but the auth server does not add an `email` identity
 * for it. With a single identity on the account, the auth server then
 * refuses to unlink Google ("last identity"), even though the password is a
 * perfectly good login. Writing the same, already-confirmed address back
 * through the Admin API creates exactly the missing `email` identity and
 * changes nothing else — no email is sent and the address stays the same.
 *
 * Called right after a password is set and right before an identity is
 * unlinked (for users whose password predates this fix). A no-op when the
 * identity exists. Failure is reported and swallowed: the password login
 * itself is already in place, and an unlink that still hits the auth
 * server's refusal surfaces as an error on the page rather than silently.
 */
export async function ensureEmailIdentity(
  userId: string,
  email: string,
  identities: readonly { readonly provider: string }[]
): Promise<void> {
  if (identities.some((i) => i.provider === 'email')) return;
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    email,
    email_confirm: true,
  });
  if (error) {
    captureError(error, '[ensureEmailIdentity] failed to create the email identity');
  }
}
