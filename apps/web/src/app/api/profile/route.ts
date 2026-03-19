import { NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';

import { logActivityEvent } from '@/lib/activity-log';
import { isUserBanned } from '@/lib/ban';
import { db, profiles } from '@/lib/db';
import { isLameName } from '@/lib/lame-name';
import { RATE_LIMITS, checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (await isUserBanned(user.id)) {
    return NextResponse.json({ error: 'banned' }, { status: 403 });
  }

  const rateLimitResult = await checkRateLimit(user.id, RATE_LIMITS.updateProfile);
  if ('error' in rateLimitResult) {
    return NextResponse.json({ error: 'rateLimited' }, { status: 429 });
  }

  let body: {
    displayName?: string;
    bio?: string;
    country?: string;
    flair?: string;
    fideId?: string;
    chesscomUsername?: string;
    lichessUsername?: string;
    xUsername?: string;
    instagramUsername?: string;
    youtubeHandle?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // Display name does not require uniqueness (same approach as X/Instagram).
  // Username serves as the unique identifier.
  const displayName = body.displayName?.trim();
  if (!displayName) {
    return NextResponse.json({ error: 'display_name_required' }, { status: 400 });
  }
  if (displayName.length > 50) {
    return NextResponse.json({ error: 'display_name_too_long' }, { status: 400 });
  }
  if (isLameName(displayName)) {
    return NextResponse.json({ error: 'display_name_inappropriate' }, { status: 400 });
  }

  const bio = body.bio?.trim() || null;
  if (bio && bio.length > 500) {
    return NextResponse.json({ error: 'bio_too_long' }, { status: 400 });
  }

  const country = body.country?.trim().toUpperCase() || null;
  if (country && !/^[A-Z]{2}$/.test(country)) {
    return NextResponse.json({ error: 'invalid_country' }, { status: 400 });
  }

  const flair = body.flair?.trim() || null;
  if (flair && flair.length > 50) {
    return NextResponse.json({ error: 'flair_too_long' }, { status: 400 });
  }
  const fideId = body.fideId?.trim() || null;
  if (fideId && fideId.length > 50) {
    return NextResponse.json({ error: 'fide_id_too_long' }, { status: 400 });
  }
  if (fideId && !/^\d+$/.test(fideId)) {
    return NextResponse.json({ error: 'fide_id_invalid_format' }, { status: 400 });
  }
  const chesscomUsername = body.chesscomUsername?.trim() || null;
  if (chesscomUsername && chesscomUsername.length > 255) {
    return NextResponse.json({ error: 'chesscom_username_too_long' }, { status: 400 });
  }
  if (chesscomUsername && !/^[a-zA-Z0-9_-]+$/.test(chesscomUsername)) {
    return NextResponse.json({ error: 'chesscom_username_invalid_format' }, { status: 400 });
  }
  const lichessUsername = body.lichessUsername?.trim() || null;
  if (lichessUsername && lichessUsername.length > 255) {
    return NextResponse.json({ error: 'lichess_username_too_long' }, { status: 400 });
  }
  if (lichessUsername && !/^[a-zA-Z0-9_-]+$/.test(lichessUsername)) {
    return NextResponse.json({ error: 'lichess_username_invalid_format' }, { status: 400 });
  }
  const xUsername = body.xUsername?.trim() || null;
  if (xUsername && xUsername.length > 15) {
    return NextResponse.json({ error: 'x_username_too_long' }, { status: 400 });
  }
  if (xUsername && !/^[a-zA-Z0-9_]+$/.test(xUsername)) {
    return NextResponse.json({ error: 'x_username_invalid_format' }, { status: 400 });
  }
  const instagramUsername = body.instagramUsername?.trim() || null;
  if (instagramUsername && instagramUsername.length > 30) {
    return NextResponse.json({ error: 'instagram_username_too_long' }, { status: 400 });
  }
  if (instagramUsername && !/^[a-zA-Z0-9._]+$/.test(instagramUsername)) {
    return NextResponse.json({ error: 'instagram_username_invalid_format' }, { status: 400 });
  }
  const youtubeHandle = body.youtubeHandle?.trim() || null;
  if (youtubeHandle && youtubeHandle.length > 30) {
    return NextResponse.json({ error: 'youtube_handle_too_long' }, { status: 400 });
  }
  if (youtubeHandle && !/^[a-zA-Z0-9._-]+$/.test(youtubeHandle)) {
    return NextResponse.json({ error: 'youtube_handle_invalid_format' }, { status: 400 });
  }

  await db
    .update(profiles)
    .set({
      displayName,
      bio,
      country,
      flair,
      fideId,
      chesscomUsername,
      lichessUsername,
      xUsername,
      instagramUsername,
      youtubeHandle,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, user.id));

  logActivityEvent({
    userId: user.id,
    action: 'update_profile',
    targetType: 'user',
    targetId: user.id,
  });

  return NextResponse.json({ success: true });
}
