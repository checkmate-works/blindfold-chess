import { NextResponse } from 'next/server';

import { and, eq, sql } from 'drizzle-orm';

import type { AchievementCriteria } from '@/lib/db/achievement-criteria-types';
import { db } from '@/lib/db/index';
import { achievements, notifications, userAchievements } from '@/lib/db/schema';

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the previous month's year and month based on the current date. */
function getPreviousMonth(): { year: number; month: number } {
  const now = new Date();
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

/** Type guard for MonthlyLeaderboardCriteria. */
function isMonthlyLeaderboardCriteria(
  criteria: unknown
): criteria is Extract<AchievementCriteria, { category: 'monthly_leaderboard' }> {
  return (
    typeof criteria === 'object' &&
    criteria !== null &&
    'category' in criteria &&
    (criteria as Record<string, unknown>).category === 'monthly_leaderboard' &&
    'menuType' in criteria &&
    'leaderboardKey' in criteria &&
    'placement' in criteria
  );
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function GET(request: Request): Promise<NextResponse> {
  // 1. Authenticate via CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Determine previous month
    const { year, month } = getPreviousMonth();
    const { start, end } = getMonthRange(year, month);

    // 3. Fetch monthly_leaderboard achievement definitions
    const achievementDefs = await db
      .select()
      .from(achievements)
      .where(eq(achievements.category, 'monthly_leaderboard'));

    if (achievementDefs.length === 0) {
      return NextResponse.json({
        message: 'No monthly_leaderboard achievements found',
        year,
        month,
        results: [],
      });
    }

    const results: GrantSummary[] = [];

    // Map to aggregate granted badges per user for notification
    const grantedByUser = new Map<string, GrantedBadgeInfo[]>();

    // 4. Process each achievement definition
    for (const def of achievementDefs) {
      const criteria = def.criteria;
      if (!isMonthlyLeaderboardCriteria(criteria)) {
        continue;
      }

      const { menuType, leaderboardKey, placement } = criteria;

      // Query top N users for this menu_type + leaderboard_key in the previous month.
      // Uses DISTINCT ON to get each user's best score, then ranks them.
      // Ranking: Score DESC -> Incorrect ASC -> Time ASC
      const rankedRows = await db.execute<RankedRow>(sql`
        SELECT user_id, score, incorrect_answers, time_taken, rank::int
        FROM (
          SELECT
            user_id, score, incorrect_answers, time_taken,
            ROW_NUMBER() OVER (
              ORDER BY score DESC, incorrect_answers ASC, time_taken ASC
            ) AS rank
          FROM (
            SELECT DISTINCT ON (user_id)
              user_id, score, incorrect_answers, time_taken
            FROM challenge_results
            WHERE menu_type = ${menuType}
              AND leaderboard_key = ${leaderboardKey}
              AND created_at >= ${start.toISOString()}
              AND created_at < ${end.toISOString()}
            ORDER BY user_id, score DESC, incorrect_answers ASC, time_taken ASC
          ) best
        ) ranked
        WHERE rank = ${placement}
      `);

      let granted = 0;
      let skipped = 0;

      // NOTE: The WHERE clause `rank = ${placement}` ensures each query returns
      // at most 1 row, so the per-row idempotency check + INSERT below does not
      // cause an N+1 problem. If the placement filter is ever relaxed to return
      // multiple rows, consider switching to a bulk INSERT with ON CONFLICT.
      for (const row of rankedRows) {
        // 5. Idempotency check: skip if badge already granted for this year/month
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

        // 6. Grant the badge
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

        // Track granted badge per user for notification
        const badges = grantedByUser.get(row.user_id) ?? [];
        badges.push({ slug: def.slug, menuType, leaderboardKey, placement });
        grantedByUser.set(row.user_id, badges);
      }

      results.push({
        slug: def.slug,
        menuType,
        leaderboardKey,
        placement,
        granted,
        skipped,
      });
    }

    // 7. Send one notification per user for all granted badges
    let notificationsSent = 0;
    for (const [userId, badges] of grantedByUser) {
      const groupKey = `achievement-monthly-${userId}-${year}-${month}`;

      // Idempotency: skip if a notification with this group_key already exists
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

    const totalGranted = results.reduce((sum, r) => sum + r.granted, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);

    return NextResponse.json({
      message: 'Monthly leaderboard badges processed',
      year,
      month,
      totalGranted,
      totalSkipped,
      notificationsSent,
      results,
    });
  } catch (error) {
    console.error('Failed to grant monthly leaderboard badges:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
