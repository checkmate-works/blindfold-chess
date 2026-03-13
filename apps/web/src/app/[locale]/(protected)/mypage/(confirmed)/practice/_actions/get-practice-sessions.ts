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

function querySessionsByRange(
  userId: string,
  menuType: string | null,
  range: { start: Date; end: Date }
) {
  const conditions = [eq(practiceSessions.userId, userId)];
  if (menuType) {
    conditions.push(eq(practiceSessions.menuType, menuType));
  }
  conditions.push(gte(practiceSessions.startedAt, range.start));
  conditions.push(lt(practiceSessions.startedAt, range.end));

  return db
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
}

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

    const currentPeriod = period ?? 'thisWeek';
    const menu = menuType ?? null;

    const rows = await querySessionsByRange(user.id, menu, getPeriodRange(currentPeriod));
    const sessions = rows.map(parsePracticeSession);

    const prevRows = await querySessionsByRange(
      user.id,
      menu,
      getPreviousPeriodRange(currentPeriod)
    );
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
