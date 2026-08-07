import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db/index';
import { achievements, notifications, userAchievements } from '@/lib/db/schema';

import { isMonthlyLeaderboardCriteria } from './type-guards';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RankedRow = {
  user_id: string;
  score: number;
  incorrect_answers: number;
  time_taken: number;
  rank: number;
};

type GrantSummary = {
  slug: string;
  menuType: string;
  leaderboardKey: string;
  placement: number;
  granted: number;
  skipped: number;
};

type GrantedBadgeInfo = {
  slug: string;
  menuType: string;
  leaderboardKey: string;
  placement: number;
};

export type GrantMonthlyLeaderboardBadgesResult = {
  year: number;
  month: number;
  totalGranted: number;
  totalSkipped: number;
  notificationsSent: number;
  results: GrantSummary[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the previous month's year and month relative to `now`. */
function getPreviousMonth(now: Date): { year: number; month: number } {
  const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const month = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth(); // getUTCMonth() is 0-based
  return { year, month };
}

/** Returns the start and end dates of the given year/month (UTC). */
function getMonthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1)); // first day of next month
  return { start, end };
}

// ---------------------------------------------------------------------------
// Per-definition processing
// ---------------------------------------------------------------------------

type AchievementDef = typeof achievements.$inferSelect;

type ProcessedAchievement = {
  summary: GrantSummary;
  /** Badges granted by this definition, one entry per receiving user. */
  granted: Array<{ userId: string; info: GrantedBadgeInfo }>;
};

/**
 * Grant a single monthly-leaderboard achievement definition: rank the previous
 * month's results, then idempotently award the badge to the placement winner.
 * Returns `null` when `def` is not a monthly-leaderboard criteria.
 */
async function processAchievementDef(
  def: AchievementDef,
  range: { start: Date; end: Date },
  year: number,
  month: number
): Promise<ProcessedAchievement | null> {
  const criteria = def.criteria;
  if (!isMonthlyLeaderboardCriteria(criteria)) {
    return null;
  }

  const { menuType, leaderboardKey, placement } = criteria;

  // Query top N users for this menu_type + leaderboard_key in the previous month.
  // Uses DISTINCT ON to get each user's best score, then ranks them.
  // Ranking: Score DESC -> Incorrect ASC -> Time ASC
  //
  // Users with `profiles.hidden_from_leaderboard` (checked at batch execution
  // time — the flag's current value is the policy) are excluded BEFORE
  // ROW_NUMBER, not by skipping the grant afterwards: skipping after ranking
  // would let a hidden user absorb a placement, so the user shown at that
  // placement on the public leaderboard would get no badge.
  const rankedRows = await db.execute<RankedRow>(sql`
    SELECT user_id, score, incorrect_answers, time_taken, rank::int
    FROM (
      SELECT
        best.user_id, best.score, best.incorrect_answers, best.time_taken,
        ROW_NUMBER() OVER (
          ORDER BY best.score DESC, best.incorrect_answers ASC, best.time_taken ASC
        ) AS rank
      FROM (
        SELECT DISTINCT ON (user_id)
          user_id, score, incorrect_answers, time_taken
        FROM challenge_results
        WHERE menu_type = ${menuType}
          AND leaderboard_key = ${leaderboardKey}
          AND created_at >= ${range.start.toISOString()}
          AND created_at < ${range.end.toISOString()}
        ORDER BY user_id, score DESC, incorrect_answers ASC, time_taken ASC
      ) best
      JOIN profiles p ON p.id = best.user_id AND NOT p.hidden_from_leaderboard
    ) ranked
    WHERE rank = ${placement}
  `);

  let granted = 0;
  let skipped = 0;
  const grantedBadges: ProcessedAchievement['granted'] = [];

  // NOTE: The WHERE clause `rank = ${placement}` ensures each query returns
  // at most 1 row, so the per-row idempotency check + INSERT below does not
  // cause an N+1 problem. If the placement filter is ever relaxed to return
  // multiple rows, consider switching to a bulk INSERT with ON CONFLICT.
  for (const row of rankedRows) {
    // Idempotency check: skip if badge already granted for this year/month.
    const existing = await db
      .select({ id: userAchievements.id })
      .from(userAchievements)
      .where(
        and(
          eq(userAchievements.userId, row.user_id),
          eq(userAchievements.achievementId, def.id),
          sql`${userAchievements.metadata}->>'year' = ${String(year)}`,
          sql`${userAchievements.metadata}->>'month' = ${String(month)}`
        )
      )
      .limit(1);

    if (existing.length > 0) {
      skipped += 1;
      continue;
    }

    await db.insert(userAchievements).values({
      userId: row.user_id,
      achievementId: def.id,
      metadata: {
        year,
        month,
        menuType,
        leaderboardKey,
        placement,
        score: row.score,
        incorrectAnswers: row.incorrect_answers,
        timeTaken: row.time_taken,
      },
    });

    granted += 1;
    grantedBadges.push({
      userId: row.user_id,
      info: { slug: def.slug, menuType, leaderboardKey, placement },
    });
  }

  return {
    summary: { slug: def.slug, menuType, leaderboardKey, placement, granted, skipped },
    granted: grantedBadges,
  };
}

/**
 * Send one `achievement_granted` notification per user covering all of that
 * user's newly granted badges. Idempotent via a per-user/month group key.
 * Returns the number of notifications actually inserted.
 */
async function sendGrantNotifications(
  grantedByUser: Map<string, GrantedBadgeInfo[]>,
  year: number,
  month: number
): Promise<number> {
  let notificationsSent = 0;
  for (const [userId, badges] of grantedByUser) {
    const groupKey = `achievement-monthly-${userId}-${year}-${month}`;

    const existingNotification = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.groupKey, groupKey)))
      .limit(1);

    if (existingNotification.length > 0) {
      continue;
    }

    await db.insert(notifications).values({
      userId,
      actorId: null,
      type: 'achievement_granted',
      targetType: 'achievement',
      targetId: null,
      groupKey,
      metadata: { badges, year, month },
    });

    notificationsSent += 1;
  }
  return notificationsSent;
}

// ---------------------------------------------------------------------------
// Main logic
// ---------------------------------------------------------------------------

export async function grantMonthlyLeaderboardBadges(
  // Injectable so the month-boundary derivation is testable deterministically,
  // matching the `now` convention used across lib/ (uuidv7, utcDayKey, …).
  now: Date = new Date()
): Promise<GrantMonthlyLeaderboardBadgesResult> {
  const { year, month } = getPreviousMonth(now);
  const range = getMonthRange(year, month);

  const achievementDefs = await db
    .select()
    .from(achievements)
    .where(eq(achievements.category, 'monthly_leaderboard'));

  if (achievementDefs.length === 0) {
    return { year, month, totalGranted: 0, totalSkipped: 0, notificationsSent: 0, results: [] };
  }

  const results: GrantSummary[] = [];
  // Aggregates granted badges per user so each user gets a single notification.
  const grantedByUser = new Map<string, GrantedBadgeInfo[]>();

  for (const def of achievementDefs) {
    const outcome = await processAchievementDef(def, range, year, month);
    if (!outcome) continue;

    results.push(outcome.summary);
    for (const { userId, info } of outcome.granted) {
      const badges = grantedByUser.get(userId) ?? [];
      badges.push(info);
      grantedByUser.set(userId, badges);
    }
  }

  const notificationsSent = await sendGrantNotifications(grantedByUser, year, month);

  return {
    year,
    month,
    totalGranted: results.reduce((sum, r) => sum + r.granted, 0),
    totalSkipped: results.reduce((sum, r) => sum + r.skipped, 0),
    notificationsSent,
    results,
  };
}
