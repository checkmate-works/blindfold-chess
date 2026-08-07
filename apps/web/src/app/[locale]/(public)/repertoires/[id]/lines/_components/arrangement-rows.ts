import type { ArrangementItem } from '@/lib/repertoires/line-order';
import { NEW_CHAPTER_KEY_PREFIX } from '@/lib/repertoires/line-order';

/** One line as the arrange list shows it. */
export type LineOrderRow = {
  kind: 'line';
  /** Stable identity: the URL segment and the "Line N" label. Never reordered. */
  lineNo: number;
  /** Authored name, or the moves-derived fallback the other surfaces show. */
  label: string;
  /** Opening moves, for telling two similarly-named lines apart while sorting. */
  moves: string;
};

/**
 * A row of the arrange list. Chapter headings, the unfiled divider, and lines
 * share one column, so grouping is positional: a line belongs to the heading
 * above it. See `resolveArrangement`, which is the server-side half of this.
 */
export type ArrangeRow =
  { kind: 'chapter'; key: string; name: string } | { kind: 'unfiled' } | LineOrderRow;

/** Stable per-row key for React and for tracking a row across a live reorder. */
export function rowKey(row: ArrangeRow): string {
  if (row.kind === 'chapter') return `c:${row.key}`;
  if (row.kind === 'unfiled') return 'unfiled';
  return `l:${row.lineNo}`;
}

const isMarker = (row: ArrangeRow) => row.kind === 'chapter' || row.kind === 'unfiled';

/**
 * The span a drag moves: a line is itself, a chapter is its heading plus every
 * line filed under it. Dragging a heading alone would silently re-file its
 * lines into whatever heading it landed under, which is never what the gesture
 * means — grabbing a chapter means moving the chapter.
 */
export function blockAt(rows: readonly ArrangeRow[], index: number): [number, number] {
  if (rows[index]?.kind !== 'chapter') return [index, index];
  let end = index;
  while (end + 1 < rows.length && !isMarker(rows[end + 1])) end += 1;
  return [index, end];
}

/**
 * The whole block row `index` belongs to: a chapter heading or a line filed
 * under one resolves to that chapter's full span; the divider and unfiled
 * lines are blocks of one.
 */
function enclosingBlock(rows: readonly ArrangeRow[], index: number): [number, number] {
  for (let i = index; i >= 0; i--) {
    const row = rows[i];
    if (row.kind === 'unfiled') break;
    if (row.kind === 'chapter') return blockAt(rows, i);
  }
  return [index, index];
}

/**
 * Where a block being dragged over row `over` should actually land.
 *
 * For a LINE: dropping it on a heading means "put it in this chapter", but a
 * plain insert-at-index would place it above the heading — i.e. in the chapter
 * before, or unfiled if there is none. So a line dragged UPWARD onto a marker
 * lands just after it instead. Dragging downward needs no such nudge: removing
 * the block first already shifts everything below it up by one, so inserting at
 * the marker's old index puts the line under it.
 *
 * For a CHAPTER block: the landing spot must never be inside another chapter's
 * span, or the tail of that chapter would end up below the dragged heading and
 * be silently re-filed under it ([A,a1,B,b1] + "A past B's heading" must give
 * [B,b1,A,a1], never [B,A,a1,b1]). So the target snaps to the far edge of
 * whatever block `over` belongs to: its start when dragging up, its end when
 * dragging down — chapters hop each other whole.
 */
export function resolveDropTarget(
  rows: readonly ArrangeRow[],
  start: number,
  end: number,
  over: number
): number {
  if (rows[start]?.kind === 'chapter') {
    const [blockStart, blockEnd] = enclosingBlock(rows, over);
    return over < start ? blockStart : blockEnd;
  }
  const ontoMarker = isMarker(rows[over]);
  return ontoMarker && over < start ? over + 1 : over;
}

/** Move `rows[start..end]` so it begins at `target`, in the pre-move indexing. */
export function moveBlock(
  rows: readonly ArrangeRow[],
  start: number,
  end: number,
  target: number
): ArrangeRow[] {
  const block = rows.slice(start, end + 1);
  const rest = [...rows.slice(0, start), ...rows.slice(end + 1)];
  const insertAt = target > end ? target - block.length + 1 : target;
  rest.splice(Math.max(0, Math.min(insertAt, rest.length)), 0, ...block);
  return rest;
}

/**
 * Chapters must all sit above the unfiled divider — "unfiled" means "below
 * every chapter", so a heading under the divider would describe a bucket that
 * is both a chapter and not one. Drags that would produce it are dropped
 * rather than corrected, so the row simply doesn't follow the pointer there.
 */
export function isArrangementValid(rows: readonly ArrangeRow[]): boolean {
  const unfiled = rows.findIndex((row) => row.kind === 'unfiled');
  if (unfiled === -1) return false;
  return !rows.some((row, index) => row.kind === 'chapter' && index > unfiled);
}

/**
 * Drop a chapter heading and send its lines back to the unfiled bucket.
 *
 * Leaving the lines where they are would fold them into whichever chapter
 * happens to precede them, which is a silent re-filing the owner never asked
 * for. Unfiled is the honest destination: the grouping they had is the thing
 * being deleted.
 */
export function removeChapter(rows: readonly ArrangeRow[], key: string): ArrangeRow[] {
  const index = rows.findIndex((row) => row.kind === 'chapter' && row.key === key);
  if (index === -1) return [...rows];
  const [start, end] = blockAt(rows, index);
  const orphans = rows.slice(start + 1, end + 1);
  return [...rows.slice(0, start), ...rows.slice(end + 1), ...orphans];
}

/** Append a new, still-unsaved chapter directly above the unfiled divider. */
export function appendChapter(rows: readonly ArrangeRow[], name: string): ArrangeRow[] {
  // Deterministic key: the smallest `new:<n>` not already present in `rows`.
  // (This used to salt with Date.now(), which made an otherwise pure
  // transform non-deterministic; collision-freedom only ever needed to hold
  // within the current row set.)
  const usedKeys = new Set(rows.flatMap((row) => (row.kind === 'chapter' ? [row.key] : [])));
  let n = usedKeys.size;
  while (usedKeys.has(`${NEW_CHAPTER_KEY_PREFIX}${n}`)) {
    n += 1;
  }

  const unfiled = rows.findIndex((row) => row.kind === 'unfiled');
  const next = [...rows];
  next.splice(unfiled === -1 ? next.length : unfiled, 0, {
    kind: 'chapter',
    key: `${NEW_CHAPTER_KEY_PREFIX}${n}`,
    name,
  });
  return next;
}

/** The payload shape the save action takes — rows minus their display-only parts. */
export function toArrangementItems(rows: readonly ArrangeRow[]): ArrangementItem[] {
  return rows.map((row) =>
    row.kind === 'chapter'
      ? { kind: 'chapter' as const, key: row.key, name: row.name }
      : row.kind === 'unfiled'
        ? { kind: 'unfiled' as const }
        : { kind: 'line' as const, lineNo: row.lineNo }
  );
}

/** Compact signature of an arrangement, for dirty-checking and drag no-ops. */
export function arrangementKey(rows: readonly ArrangeRow[]): string {
  return rows
    .map((row) => (row.kind === 'chapter' ? `c:${row.key}=${row.name.trim()}` : rowKey(row)))
    .join('|');
}
