import { cache } from 'react';

import { and, eq, isNull } from 'drizzle-orm';

import { db, positions, profiles } from '@/lib/db';
import { UUID_RE } from '@/lib/validations/uuid';

/**
 * Fetch a single (non-deleted) memory position by id.
 *
 * Wrapped with `React.cache` for per-request deduplication so multiple
 * callers (page + generateMetadata + siblings) share a single DB roundtrip.
 */
export const getMemoryPositionById = cache(async (id: string) => {
  if (!UUID_RE.test(id)) return null;

  const [row] = await db
    .select({ id: positions.id, fen: positions.fen })
    .from(positions)
    .where(and(eq(positions.id, id), eq(positions.type, 'memory'), isNull(positions.deletedAt)))
    .limit(1);

  return row ?? null;
});

/**
 * Fetch a memory position along with its author profile.
 *
 * Wrapped with `React.cache` so `generateMetadata` and the page component
 * can each call it without hitting the DB twice.
 */
export const getMemoryPositionWithProfileById = cache(async (id: string) => {
  if (!UUID_RE.test(id)) return null;

  const [row] = await db
    .select({
      position: positions,
      profile: {
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(positions)
    .leftJoin(profiles, eq(positions.userId, profiles.id))
    .where(and(eq(positions.id, id), eq(positions.type, 'memory'), isNull(positions.deletedAt)))
    .limit(1);

  return row ?? null;
});
