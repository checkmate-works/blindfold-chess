import { NextResponse } from 'next/server';

import { validateUsername } from '@blindfold-chess/features/username';
import { eq } from 'drizzle-orm';

import { guardApiMutation, parseJsonBody } from '@/lib/api-mutation-guard';
import { isLameName } from '@/lib/content/lame-name';
import { db, profiles } from '@/lib/db';
import { isUniqueViolation } from '@/lib/db/extract-pg-error-code';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  const guardResult = await guardApiMutation(request, RATE_LIMITS.setupUsername);
  if ('response' in guardResult) {
    return guardResult.response;
  }
  const { user } = guardResult;

  const parseResult = await parseJsonBody<{ username?: string; displayName?: string }>(request);
  if ('response' in parseResult) {
    return parseResult.response;
  }
  const { body } = parseResult;

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
