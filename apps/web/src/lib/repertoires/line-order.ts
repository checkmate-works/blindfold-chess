/**
 * Does `ordered` describe a valid rearrangement of exactly `live`?
 *
 * A reorder is a PERMUTATION, never a partial update: the client sends the
 * whole list back, so anything other than "the same numbers, rearranged" means
 * the two sides disagree about what the list contains. Rejecting that is what
 * keeps a stale tab from doing damage — if a line was deleted elsewhere while
 * someone was dragging, an accept-what-you-can merge would quietly drop the
 * missing line to the end (or, worse, write a `seq` onto a soft-deleted row and
 * revive it in the ordering). The caller re-reads instead.
 *
 * Rejects, specifically: a different count, a duplicate, a number not in `live`,
 * and — via the count check — any line missing from the submission.
 */
export function isCompleteReorder(live: readonly number[], ordered: readonly number[]): boolean {
  const liveSet = new Set(live);
  const orderedSet = new Set(ordered);
  return (
    orderedSet.size === ordered.length &&
    orderedSet.size === liveSet.size &&
    ordered.every((lineNo) => liveSet.has(lineNo))
  );
}

/** Longest a chapter name may be — matches `repertoire_chapters.name`. */
export const REPERTOIRE_CHAPTER_NAME_MAX = 255;

/**
 * Most chapters one repertoire may hold. Far above any real course (Chessable's
 * own run tens, not hundreds) — this is a write-amplification guard, not a
 * product decision: without it one Save inside the rate limit could insert an
 * unbounded number of rows.
 */
export const REPERTOIRE_CHAPTERS_MAX = 50;

/** Prefix marking a chapter the owner added but the database has not seen yet. */
export const NEW_CHAPTER_KEY_PREFIX = 'new:';

/**
 * One row of the arrange page, in the order it appears there. The page is a
 * single flat list — chapter headings, lines, and the unfiled divider all sit
 * in one column — so the arrangement IS this sequence, and grouping is derived
 * from it rather than stated separately. That is what makes "move a line into a
 * chapter" and "reorder within a chapter" the same gesture.
 */
export type ArrangementItem =
  | { kind: 'chapter'; key: string; name: string }
  | { kind: 'unfiled' }
  | { kind: 'line'; lineNo: number };

export type ResolvedArrangement = {
  /** Chapters in list order; `seq` is the index among chapters. */
  chapters: { key: string; name: string; seq: number }[];
  /** Every line with the chapter it fell under and its order inside it. */
  lines: { lineNo: number; chapterKey: string | null; seq: number }[];
};

/**
 * Turn the flat list into the rows to write: a line belongs to the nearest
 * heading above it, and `seq` counts from 0 within that bucket.
 *
 * `chapterKey` is null for the unfiled bucket — reached either by sitting below
 * the unfiled divider or by sitting above every heading. The second case cannot
 * be produced by the UI (the divider is pinned last, and headings sort above
 * it), but resolving it to "unfiled" rather than rejecting it keeps this a
 * total function: there is no arrangement of rows this cannot describe.
 */
export function resolveArrangement(items: readonly ArrangementItem[]): ResolvedArrangement {
  const chapters: ResolvedArrangement['chapters'] = [];
  const lines: ResolvedArrangement['lines'] = [];
  // Per-bucket running counter, so each chapter's lines are 0..n-1.
  const seqByBucket = new Map<string | null, number>();
  let bucket: string | null = null;

  for (const item of items) {
    if (item.kind === 'chapter') {
      chapters.push({ key: item.key, name: item.name.trim(), seq: chapters.length });
      bucket = item.key;
    } else if (item.kind === 'unfiled') {
      bucket = null;
    } else {
      const seq = seqByBucket.get(bucket) ?? 0;
      seqByBucket.set(bucket, seq + 1);
      lines.push({ lineNo: item.lineNo, chapterKey: bucket, seq });
    }
  }

  return { chapters, lines };
}

export type ArrangementError = 'staleOrder' | 'invalidChapter';

/**
 * Reject an arrangement the server should not act on.
 *
 * Lines are held to the same permutation rule as {@link isCompleteReorder} —
 * they are the content, and a mismatch means the client is describing a course
 * that no longer exists. Chapters are looser by design: a live chapter left out
 * of the list is a DELETION (that is how the page's delete button works), so
 * absence is meaningful rather than stale. A chapter created in another tab is
 * therefore silently dropped by a save from this one; the cost is a name, the
 * lines it held are re-filed explicitly by this same payload, and paying for
 * more than that would mean a version column for one text field.
 */
export function validateArrangement(
  items: readonly ArrangementItem[],
  liveLineNos: readonly number[],
  liveChapterIds: readonly string[]
): ArrangementError | null {
  if (items.filter((item) => item.kind === 'unfiled').length > 1) return 'staleOrder';

  const submittedLineNos = items.flatMap((item) => (item.kind === 'line' ? [item.lineNo] : []));
  if (!isCompleteReorder(liveLineNos, submittedLineNos)) return 'staleOrder';

  const live = new Set(liveChapterIds);
  const seen = new Set<string>();
  if (items.filter((item) => item.kind === 'chapter').length > REPERTOIRE_CHAPTERS_MAX) {
    return 'invalidChapter';
  }
  for (const item of items) {
    if (item.kind !== 'chapter') continue;
    if (seen.has(item.key)) return 'invalidChapter';
    seen.add(item.key);

    const name = item.name.trim();
    if (!name || name.length > REPERTOIRE_CHAPTER_NAME_MAX) return 'invalidChapter';

    // Either a chapter this repertoire already has, or one the client is asking
    // to create. Anything else is an id from somewhere it has no business
    // naming — the composite FK would refuse it, but say so here instead of
    // surfacing a constraint violation.
    if (!item.key.startsWith(NEW_CHAPTER_KEY_PREFIX) && !live.has(item.key)) {
      return 'invalidChapter';
    }
  }

  return null;
}
