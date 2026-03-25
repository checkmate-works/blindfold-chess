import { NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';

import { db, profiles } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ avatarUrl: null, displayName: null }, { status: 401 });
  }

  const [profile] = await db
    .select({ avatarUrl: profiles.avatarUrl, displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return NextResponse.json({
    avatarUrl: profile?.avatarUrl ?? null,
    displayName: profile?.displayName ?? null,
  });
}
