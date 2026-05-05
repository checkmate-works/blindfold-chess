'use server';

import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/app/admin/_lib/auth';
import { eq } from 'drizzle-orm';

import { db, moderationActions, userGrants } from '@/lib/db';
import { getClientIp } from '@/lib/security/client-ip';

type ActionResult = { success: true } | { error: string };

type RevokeTxResult = { ok: true } | { error: 'notFound' | 'alreadyRevoked' };

export async function revokeGrant(grantId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return { error: 'unauthorized' };

  if (!grantId) {
    return { error: 'Grant ID is required' };
  }

  const ipAddress = await getClientIp();

  // Lookup + update + audit insert run in a single transaction so the
  // moderation_actions row is guaranteed to be written exactly when the grant
  // is revoked. The select uses `for('update')` to row-lock the grant against
  // a concurrent revoke (e.g., admin re-clicking the button on two tabs).
  try {
    const result: RevokeTxResult = await db.transaction(async (tx): Promise<RevokeTxResult> => {
      const [grant] = await tx
        .select({
          userId: userGrants.userId,
          benefitType: userGrants.benefitType,
          grantType: userGrants.grantType,
          revokedAt: userGrants.revokedAt,
        })
        .from(userGrants)
        .where(eq(userGrants.id, grantId))
        .for('update');

      if (!grant) {
        return { error: 'notFound' };
      }
      if (grant.revokedAt !== null) {
        return { error: 'alreadyRevoked' };
      }

      await tx.update(userGrants).set({ revokedAt: new Date() }).where(eq(userGrants.id, grantId));

      await tx.insert(moderationActions).values({
        actorId: auth.userId,
        action: 'revoke_grant',
        targetType: 'user',
        targetId: grant.userId,
        metadata: {
          grantId,
          grantType: grant.grantType,
          benefitType: grant.benefitType,
        },
        ipAddress,
      });

      return { ok: true };
    });

    if ('error' in result) {
      return { error: result.error };
    }

    revalidateTag('grant-status', { expire: 60 });
    // See `createGrant.ts` — the target user's `bfc_ads_hidden` cookie
    // cannot be updated from an admin action; it self-corrects on their
    // next authenticated page load or when the cookie TTL expires.
    return { success: true };
  } catch (error) {
    console.error('Failed to revoke grant:', error);
    return { error: 'Failed to revoke grant' };
  }
}
