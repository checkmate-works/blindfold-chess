import { cache } from 'react';

import { eq } from 'drizzle-orm';
import 'server-only';

import { db, profiles } from '../db';

/**
 * The signed-in viewer's own `profiles` row, deduplicated per request.
 *
 * The protected layout (ban check), the `(confirmed)` layout (username
 * check), and the mypage pages all need this same row; before this helper
 * each ran its own ad-hoc SELECT, so one protected page view paid up to
 * three identical lookups. `React.cache` memoizes by function identity —
 * a second independently-written query does NOT dedupe — so every
 * render-tree read of the viewer's profile must go through this function.
 *
 * Fetches the full row on purpose: it is a single PK lookup, and a shared
 * full row lets column-narrow callers (username-only, bannedAt-only) hit
 * the same memo entry instead of shipping their own projections.
 */
export const getViewerProfile = cache(async (userId: string) => {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  return profile ?? null;
});
