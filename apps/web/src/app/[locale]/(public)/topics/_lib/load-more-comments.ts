import type { ReactNode } from 'react';

/**
 * One server-rendered comment-tree batch, as returned by a page's
 * `loadMoreXComments` Server Action. `node` is the batch's already-rendered
 * subtree (a `<XCommentTreeBatch>` — CommentTree plus the page's action
 * wiring), serialized over the RSC payload; the client wrapper appends it
 * verbatim, so reply permissions, attachment cards and edit affordances are
 * resolved on the server exactly like the SSR'd first batch.
 *
 * Lives in a plain module (no 'use client' / 'use server' directive) so both
 * the client wrapper and the per-page 'use server' action files can
 * `import type` it — 'use server' files must not re-export types (see
 * apps/web/CLAUDE.md).
 */
export type LoadMoreCommentsResult = {
  node: ReactNode;
  hasMore: boolean;
  nextOffset: number;
};

/**
 * The bound shape the client wrapper calls: pages bind their topic key and
 * validated sort into the page's Server Action via `.bind(null, ...)`, so
 * only the offset varies per call.
 */
export type LoadMoreCommentsAction = (offset: number) => Promise<LoadMoreCommentsResult>;

/**
 * Sanitize the client-supplied offset before it reaches SQL: non-integers
 * and negatives collapse to 0, and an upper bound caps the OFFSET a hostile
 * caller can make Postgres skip through. Past-the-end offsets are harmless
 * (empty page, hasMore=false).
 */
export function clampCommentOffset(offset: number): number {
  if (!Number.isInteger(offset) || offset < 0) return 0;
  return Math.min(offset, 10_000);
}
