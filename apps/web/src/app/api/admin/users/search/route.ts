import { NextResponse } from 'next/server';

import { adminApiGuard } from '@/app/admin/_lib/auth';
import { ilike } from 'drizzle-orm';

import { db, profiles } from '@/lib/db';

/** Escape LIKE/ILIKE special characters so user input is treated as a literal prefix. */
function escapeLikePattern(s: string): string {
  return s.replace(/[%_\\]/g, '\\$&');
}

export async function GET(request: Request) {
  const auth = await adminApiGuard();
  if ('response' in auth) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';

  if (q.length < 1) {
    return NextResponse.json({ users: [] });
  }

  const results = await db
    .select({ id: profiles.id, username: profiles.username })
    .from(profiles)
    .where(ilike(profiles.username, `${escapeLikePattern(q)}%`))
    .limit(10);

  return NextResponse.json({ users: results });
}
