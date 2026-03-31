import { NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';

import { authenticateAndGuardApi } from '@/lib/auth';
import { db, profiles } from '@/lib/db';
import { isUniqueViolation } from '@/lib/db/extract-pg-error-code';
import { isLameName } from '@/lib/lame-name';
import { RATE_LIMITS } from '@/lib/rate-limit';
import { validateUsername } from '@/lib/username';

export async function POST(request: Request) {
  const guardResult = await authenticateAndGuardApi(RATE_LIMITS.setupUsername);
  if ('response' in guardResult) {
    return guardResult.response;
  }
  const { user } = guardResult;

  let body: { username?: string; displayName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const username = body.username?.trim();
  if (!username) {
    return NextResponse.json({ error: 'username_required' }, { status: 400 });
  }

  const displayName = body.displayName?.trim() || username;

  const validationError = validateUsername(username);
  if (validationError) {
    const status = validationError === 'reserved' ? 409 : 400;
    return NextResponse.json({ error: validationError }, { status });
  }

  if (isLameName(username)) {
    return NextResponse.json({ error: 'username_inappropriate' }, { status: 400 });
  }

  if (isLameName(displayName)) {
    return NextResponse.json({ error: 'display_name_inappropriate' }, { status: 400 });
  }

  // Check if profile already exists (prevent double creation)
  const [existingProfile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (existingProfile) {
    return NextResponse.json({ error: 'username_already_set' }, { status: 409 });
  }

  // Create profile with chosen username.
  // The DB UNIQUE constraint on username handles race conditions.
  try {
    await db.insert(profiles).values({
      id: user.id,
      username,
      displayName,
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return NextResponse.json({ error: 'username_taken' }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json({ success: true });
}
