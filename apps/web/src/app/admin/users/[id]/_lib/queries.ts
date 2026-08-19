import type { SupabaseClient, User } from '@supabase/supabase-js';
import { and, desc, eq } from 'drizzle-orm';

import { db, moderationActions, profiles, subscriptions, userRanks, userRoles } from '@/lib/db';
import type { ModerationAction, Profile, Subscription } from '@/lib/db/schema';
import {
  type PointBalanceSummary,
  type PointHistoryEntry,
  getPointBalanceSummary,
  getPointHistory,
} from '@/lib/points';

import { getAllRanks } from '../../_lib/queries/population';

/**
 * How many recent coin (points-ledger) transactions the user-detail Coins
 * card shows inline. A deeper, filterable view lives on /admin/coins
 * (`?user=<id>`); this card is only a recent-activity snapshot.
 */
export const COIN_HISTORY_LIMIT = 10;

export type UserRankEntry = {
  slug: string;
  level: number;
  color: string | null;
  achievedAt: Date;
};

/** A moderation action with the acting admin's email resolved (null if unresolved). */
export type ModerationEntry = ModerationAction & { actorEmail: string | null };

export type UserDetail = {
  authUser: User;
  profile: Profile | undefined;
  role: string | undefined;
  subscriptions: Subscription[];
  moderationEntries: ModerationEntry[];
  ranks: UserRankEntry[];
  currentRank: UserRankEntry | null;
  /** Latest ban reason, surfaced for the status badge. */
  banReason: string | null;
  /** Current spendable coin balance, rolled up by category. */
  coinBalance: PointBalanceSummary;
  /** Most-recent coin ledger entries (capped at `COIN_HISTORY_LIMIT`). */
  coinHistory: PointHistoryEntry[];
};

/**
 * Aggregate everything the admin user-detail page needs for a single user:
 * auth record, profile, role, subscriptions, moderation history (with actor
 * emails resolved), and achieved ranks. Returns `null` when no auth user
 * exists for the id so the page can `notFound()`.
 */
export async function fetchUserDetail(
  adminClient: SupabaseClient,
  id: string
): Promise<UserDetail | null> {
  const { data, error } = await adminClient.auth.admin.getUserById(id);
  if (error || !data?.user) return null;
  const authUser = data.user;

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  const [roleRow] = await db.select().from(userRoles).where(eq(userRoles.userId, id)).limit(1);

  const userSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, id))
    .orderBy(desc(subscriptions.createdAt));

  const actions = await db
    .select()
    .from(moderationActions)
    .where(and(eq(moderationActions.targetType, 'user'), eq(moderationActions.targetId, id)))
    .orderBy(desc(moderationActions.createdAt));

  // Resolve acting-admin emails. Dedupe ids first — moderation history for a
  // single user is small, and admins recur, so this is a handful of lookups.
  const uniqueActorIds = [...new Set(actions.map((a) => a.actorId))];
  const actorEmailMap = new Map<string, string | null>();
  await Promise.all(
    uniqueActorIds.map(async (actorId) => {
      const { data: actorData } = await adminClient.auth.admin.getUserById(actorId);
      actorEmailMap.set(actorId, actorData?.user?.email ?? null);
    })
  );
  const moderationEntries: ModerationEntry[] = actions.map((a) => ({
    ...a,
    actorEmail: actorEmailMap.get(a.actorId) ?? null,
  }));

  const banReason = moderationEntries.find((a) => a.action === 'ban')?.reason ?? null;

  const coinBalance = await getPointBalanceSummary(id);
  const coinHistory = await getPointHistory(id, COIN_HISTORY_LIMIT);

  const rankById = await getAllRanks();
  const userRankRows = await db.select().from(userRanks).where(eq(userRanks.userId, id));
  const ranks: UserRankEntry[] = userRankRows
    .map((ur) => {
      const rank = rankById.get(ur.rankId);
      if (!rank) return null;
      return {
        slug: rank.slug,
        level: rank.level,
        color: rank.color,
        achievedAt: ur.achievedAt,
      };
    })
    .filter((entry): entry is UserRankEntry => entry !== null)
    .sort((a, b) => b.level - a.level);

  return {
    authUser,
    profile,
    role: roleRow?.role,
    subscriptions: userSubscriptions,
    moderationEntries,
    ranks,
    currentRank: ranks[0] ?? null,
    banReason,
    coinBalance,
    coinHistory,
  };
}
