'use server';

import { requireAdmin } from '@/app/admin/_lib/auth';
import { type SQL, and, gte, isNotNull, isNull, lt } from 'drizzle-orm';

import { db, profiles } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';

export type ProfileStatus = 'all' | 'anonymous' | 'has_profile';

export type SearchUsersParams = {
  createdFrom?: string; // ISO date string
  createdTo?: string;
  lastSignInFrom?: string;
  lastSignInTo?: string;
  profileStatus?: ProfileStatus;
};

export type SearchedUser = {
  userId: string;
  email: string | null;
  username: string;
  displayName: string | null;
  createdAt: string;
  lastSignInAt: string | null;
};

type ActionResult = { users: SearchedUser[] } | { error: string };

export async function searchUsers(params: SearchUsersParams): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return { error: 'unauthorized' };

  try {
    // Build profile query conditions
    const conditions: SQL[] = [];

    if (params.createdFrom) {
      conditions.push(gte(profiles.createdAt, new Date(params.createdFrom + 'T00:00:00.000Z')));
    }
    if (params.createdTo) {
      // Use next day 00:00:00 UTC with < comparison for precise end-of-day
      const nextDay = new Date(params.createdTo + 'T00:00:00.000Z');
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      conditions.push(lt(profiles.createdAt, nextDay));
    }
    if (params.profileStatus === 'anonymous') {
      conditions.push(isNull(profiles.displayName));
    } else if (params.profileStatus === 'has_profile') {
      conditions.push(isNotNull(profiles.displayName));
    }

    const profileRows = await db
      .select({
        id: profiles.id,
        username: profiles.username,
        displayName: profiles.displayName,
        createdAt: profiles.createdAt,
      })
      .from(profiles)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    if (profileRows.length === 0) {
      return { users: [] };
    }

    // Fetch auth users for email and lastSignInAt via Supabase Admin API
    const adminClient = createAdminClient();
    const authUserMap = new Map<string, { email: string | null; lastSignInAt: string | null }>();

    // Fetch only the users we need by ID (not all users)
    const authResults = await Promise.all(
      profileRows.map(async (p) => {
        const { data } = await adminClient.auth.admin.getUserById(p.id);
        return { id: p.id, data };
      })
    );

    for (const { id, data } of authResults) {
      authUserMap.set(id, {
        email: data?.user?.email ?? null,
        lastSignInAt: data?.user?.last_sign_in_at ?? null,
      });
    }

    // Merge profile data with auth data
    let users: SearchedUser[] = profileRows.map((p) => {
      const authInfo = authUserMap.get(p.id);
      return {
        userId: p.id,
        email: authInfo?.email ?? null,
        username: p.username,
        displayName: p.displayName,
        createdAt: p.createdAt.toISOString(),
        lastSignInAt: authInfo?.lastSignInAt ?? null,
      };
    });

    // Apply lastSignIn filters (post-merge since it comes from auth API)
    if (params.lastSignInFrom) {
      const from = new Date(params.lastSignInFrom + 'T00:00:00.000Z');
      users = users.filter((u) => u.lastSignInAt !== null && new Date(u.lastSignInAt) >= from);
    }
    if (params.lastSignInTo) {
      // Use next day 00:00:00 UTC with < comparison for precise end-of-day
      const nextDay = new Date(params.lastSignInTo + 'T00:00:00.000Z');
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      users = users.filter((u) => u.lastSignInAt !== null && new Date(u.lastSignInAt) < nextDay);
    }

    return { users };
  } catch (error) {
    console.error('Failed to search users:', error);
    return { error: 'Failed to search users' };
  }
}
