'use server';

import { and, desc, eq, gte, lt } from 'drizzle-orm';

import { db } from '@/lib/db';
import type { PracticeMenuType } from '@/lib/db/practice-session-types';
import { PRACTICE_MENU_TYPES } from '@/lib/db/practice-session-types';
import { practiceSessions } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';

export type PracticeSessionRow = {
  id: string;
  menuType: string;
  startedAt: Date | null;
  result: Record<string, unknown>;
};

export type DatePeriod = 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth';

type PeriodRange = {
  start: Date;
  end: Date;
};

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0 offset
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getPeriodRange(period: DatePeriod): PeriodRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'thisWeek': {
      const monday = getMondayOfWeek(today);
      const end = new Date(today);
      end.setDate(end.getDate() + 1); // end of today (exclusive)
      return { start: monday, end };
    }
    case 'lastWeek': {
      const thisMonday = getMondayOfWeek(today);
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(lastMonday.getDate() - 7);
      return { start: lastMonday, end: thisMonday };
    }
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today);
      end.setDate(end.getDate() + 1);
      return { start, end };
    }
    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start, end };
    }
  }
}

function getPreviousPeriod(period: DatePeriod): DatePeriod | null {
  switch (period) {
    case 'thisWeek':
      return 'lastWeek';
    case 'lastWeek':
      return null; // 2 weeks ago - computed directly
    case 'thisMonth':
      return 'lastMonth';
    case 'lastMonth':
      return null; // 2 months ago - computed directly
  }
}

function getPreviousPeriodRange(period: DatePeriod): PeriodRange {
  const prevPeriod = getPreviousPeriod(period);
  if (prevPeriod) {
    return getPeriodRange(prevPeriod);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (period === 'lastWeek') {
    // 2 weeks ago
    const thisMonday = getMondayOfWeek(today);
    const twoWeeksAgoMonday = new Date(thisMonday);
    twoWeeksAgoMonday.setDate(twoWeeksAgoMonday.getDate() - 14);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(lastMonday.getDate() - 7);
    return { start: twoWeeksAgoMonday, end: lastMonday };
  }

  // lastMonth -> 2 months ago
  const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  const end = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  return { start, end };
}

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
        result: practiceSessions.result,
      })
      .from(practiceSessions)
      .where(and(...conditions))
      .orderBy(desc(practiceSessions.startedAt));

    const sessions: PracticeSessionRow[] = rows.map((row) => ({
      id: row.id,
      menuType: row.menuType,
      startedAt: row.startedAt,
      result: row.result as Record<string, unknown>,
    }));

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
        result: practiceSessions.result,
      })
      .from(practiceSessions)
      .where(and(...prevConditions))
      .orderBy(desc(practiceSessions.startedAt));

    const previousSessions: PracticeSessionRow[] = prevRows.map((row) => ({
      id: row.id,
      menuType: row.menuType,
      startedAt: row.startedAt,
      result: row.result as Record<string, unknown>,
    }));

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
