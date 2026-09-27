import type { Replier } from '@/lib/db/reply-meta-queries';
import { resolveAuthorName } from '@/lib/users/display-name';

export type ReplierRow = {
  rootPostId: string | null;
  userId: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

/**
 * Unique repliers per root post, in row order (callers pass rows newest
 * first). Both the avatar preview and the "+N" overflow count are derived
 * from this one grouping: they used to be two maps mutated in lockstep, with
 * `seenUsers.set` unconditional but `repliersMap.set` nested inside the
 * `length < 3` check — so touching the cap could leave a nonzero count beside
 * an empty avatar list.
 */
export function groupUniqueRepliers(rows: readonly ReplierRow[]): Map<string, Replier[]> {
  const uniqueRepliersByPost = new Map<string, Replier[]>();
  const seenUserIdsByPost = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!row.rootPostId) continue;
    // Skip repliers whose author was anonymised (user_id NULL — account purged):
    // there is no distinct profile to dedup by, avatar, or link in the preview.
    if (!row.userId) continue;

    const seen = seenUserIdsByPost.get(row.rootPostId) ?? new Set<string>();
    seenUserIdsByPost.set(row.rootPostId, seen);
    if (seen.has(row.userId)) continue;
    seen.add(row.userId);

    const repliers = uniqueRepliersByPost.get(row.rootPostId) ?? [];
    uniqueRepliersByPost.set(row.rootPostId, repliers);
    repliers.push({
      avatarUrl: row.avatarUrl,
      // `null`, not a word: see the `Replier.displayName` TSDoc.
      displayName: resolveAuthorName(row, { fallback: null }),
    });
  }
  return uniqueRepliersByPost;
}
