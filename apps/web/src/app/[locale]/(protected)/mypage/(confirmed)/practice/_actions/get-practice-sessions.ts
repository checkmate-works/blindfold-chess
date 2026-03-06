'use server';

import { and, desc, eq, gte, lt } from 'drizzle-orm';

import { db } from '@/lib/db';
import type { PracticeMenuType } from '@/lib/db/practice-session-types';
import { PRACTICE_MENU_TYPES, parsePracticeSession } from '@/lib/db/practice-session-types';
import type { PracticeSessionRow } from '@/lib/db/practice-session-types';
import { practiceSessions } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';

import type { DatePeriod } from '../_lib/period-utils';
import { getPeriodRange, getPreviousPeriodRange } from '../_lib/period-utils';

export type { PracticeSessionRow } from '@/lib/db/practice-session-types';
export type { DatePeriod } from '../_lib/period-utils';

export type GetPracticeSessionsResponse = {
  success: boolean;
  sessions: PracticeSessionRow[];
  previousSessions: PracticeSessionRow[];
};

export async function getPracticeSessions(
  menuType?: PracticeMenuType,
  period?: DatePeriod
): Promise<GetPracticeSessionsResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, sessions: [], previousSessions: [] };
    }

    const conditions = [eq(practiceSessions.userId, user.id)];
    if (menuType) {
      conditions.push(eq(practiceSessions.menuType, menuType));
    }

    const currentPeriod = period ?? 'thisWeek';
    const range = getPeriodRange(currentPeriod);
    conditions.push(gte(practiceSessions.startedAt, range.start));
    conditions.push(lt(practiceSessions.startedAt, range.end));

    const rows = await db
      .select({
        id: practiceSessions.id,
        menuType: practiceSessions.menuType,
        startedAt: practiceSessions.startedAt,
        settings: practiceSessions.settings,
        result: practiceSessions.result,
      })
      .from(practiceSessions)
      .where(and(...conditions))
      .orderBy(desc(practiceSessions.startedAt));

    const sessions = rows.map(parsePracticeSession);

    // Fetch previous period data for comparison
    const prevRange = getPreviousPeriodRange(currentPeriod);
    const prevConditions = [eq(practiceSessions.userId, user.id)];
    if (menuType) {
      prevConditions.push(eq(practiceSessions.menuType, menuType));
    }
    prevConditions.push(gte(practiceSessions.startedAt, prevRange.start));
    prevConditions.push(lt(practiceSessions.startedAt, prevRange.end));

    const prevRows = await db
      .select({
        id: practiceSessions.id,
        menuType: practiceSessions.menuType,
        startedAt: practiceSessions.startedAt,
        settings: practiceSessions.settings,
        result: practiceSessions.result,
      })
      .from(practiceSessions)
      .where(and(...prevConditions))
      .orderBy(desc(practiceSessions.startedAt));

    const previousSessions = prevRows.map(parsePracticeSession);

    return { success: true, sessions, previousSessions };
  } catch (error) {
    console.error('Failed to fetch practice sessions:', error);
    return { success: false, sessions: [], previousSessions: [] };
  }
}

export async function getAvailableMenuTypes(): Promise<PracticeMenuType[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const rows = await db
      .selectDistinct({ menuType: practiceSessions.menuType })
      .from(practiceSessions)
      .where(eq(practiceSessions.userId, user.id));

    return rows
      .map((r) => r.menuType)
      .filter((m): m is PracticeMenuType => PRACTICE_MENU_TYPES.includes(m as PracticeMenuType));
  } catch {
    return [];
  }
}
