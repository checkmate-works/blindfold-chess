import { NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';

import { db, profiles } from '@/lib/db';
import { isLameName } from '@/lib/lame-name';
import { createClient } from '@/lib/supabase/server';
import { validateUsername } from '@/lib/username';

const PG_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    (e as { code: string }).code === PG_UNIQUE_VIOLATION
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

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
    return NextResponse.json({ error: validationError }, { status: 400 });
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
