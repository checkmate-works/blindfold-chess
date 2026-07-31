'use client';

import { useRef, useState, useTransition } from 'react';

import { useRouter } from '@/i18n/routing';
import { HiBars3, HiChevronDown, HiChevronUp } from 'react-icons/hi2';

import { reorderLines } from '../../_actions/reorderLines';

/** One line as the manage list shows it — order-relevant fields only. */
export type LineOrderRow = {
  /** Stable identity: the URL segment and the "Line N" label. Never reordered. */
  lineNo: number;
  /** Authored name, or the moves-derived fallback the other surfaces show. */
  label: string;
  /** Opening moves, for telling two similarly-named lines apart while sorting. */
  moves: string;
};

type Props = {
  repertoireId: string;
  rows: LineOrderRow[];
  labels: {
    hint: string;
    dragHandle: string;
    moveUp: string;
    moveDown: string;
    error: string;
  };
};

function move<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const orderKey = (rows: LineOrderRow[]) => rows.map((r) => r.lineNo).join(',');

/**
 * Drag-and-drop (and ▲▼) reordering of a repertoire's lines, for the owner.
 *
 * Dragging is bound to the grip handle rather than the whole row, and the
 * handle alone carries `touch-action: none`. That is what makes the list work
 * on a phone: a vertical swipe anywhere else still scrolls the page normally,
 * and only a press that starts on the grip is claimed as a drag. Pointer
 * events (not HTML5 `draggable`, which the admin creative list uses) for the
 * same reason — HTML5 drag never fires on touch.
 *
 * The ▲▼ buttons are not a fallback for a broken drag; they are the keyboard
 * and screen-reader path to the same operation, which a pointer gesture cannot
 * provide on its own.
 *
 * Order is positional — the server takes the resulting `line_no` sequence and
 * writes each line's index to `seq`. The numbers themselves never change, so a
 * reordered list legitimately reads "3, 1, 2"; that is identity, not a stale
 * render.
 */
export function LineOrderList({ repertoireId, rows: initialRows, labels }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  // Order when the gesture started, so a drag that ends where it began — or a
  // press that never moved — doesn't spend a write.
  const startOrderRef = useRef('');

  function persist(ordered: LineOrderRow[]) {
    setFailed(false);
    startTransition(async () => {
      const result = await reorderLines({
        repertoireId,
        orderedLineNos: ordered.map((r) => r.lineNo),
      });
      if (result.ok) return;
      // Either the write failed or the client was stale (a line deleted in
      // another tab). Both are resolved by re-reading the server's order.
      setFailed(true);
      router.refresh();
    });
  }

  /** Which row the pointer is currently over, in the CURRENT display order. */
  function indexAtY(clientY: number): number | null {
    for (let i = 0; i < rowRefs.current.length; i++) {
      const el = rowRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) return i;
    }
    return null;
  }

  function handlePointerDown(index: number, e: React.PointerEvent<HTMLButtonElement>) {
    // Claim the gesture so the browser doesn't turn it into a scroll or a
    // text selection, and keep receiving moves even outside the handle.
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragIndex(index);
    startOrderRef.current = orderKey(rows);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (dragIndex === null) return;
    const over = indexAtY(e.clientY);
    if (over === null || over === dragIndex) return;
    setRows((prev) => move(prev, dragIndex, over));
    setDragIndex(over);
  }

  function handlePointerUp() {
    if (dragIndex === null) return;
    setDragIndex(null);
    if (orderKey(rows) !== startOrderRef.current) persist(rows);
  }

  function step(index: number, delta: number) {
    const to = index + delta;
    if (to < 0 || to >= rows.length) return;
    const next = move(rows, index, to);
    setRows(next);
    persist(next);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{labels.hint}</p>
        {failed && <p className="text-xs text-destructive">{labels.error}</p>}
      </div>

      <ul className={`space-y-2 ${isPending ? 'opacity-70' : ''}`}>
        {rows.map((row, index) => (
          <li
            key={row.lineNo}
            ref={(el) => {
              rowRefs.current[index] = el;
            }}
            className={`flex items-center gap-2 rounded-lg border bg-card px-2 py-2 ${
              index === dragIndex ? 'border-link-primary shadow-sm' : 'border-border'
            }`}
          >
            <button
              type="button"
              aria-label={labels.dragHandle}
              onPointerDown={(e) => handlePointerDown(index, e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              // Without this the browser consumes a touch-drag as a scroll
              // before any pointermove reaches React.
              style={{ touchAction: 'none' }}
              className="flex size-9 flex-shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <HiBars3 aria-hidden className="size-4" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{row.label}</p>
              <p className="truncate text-xs text-muted-foreground">{row.moves}</p>
            </div>

            <span className="flex-shrink-0 text-xs tabular-nums text-foreground/40">
              #{row.lineNo}
            </span>

            <div className="flex flex-shrink-0 flex-col">
              <button
                type="button"
                aria-label={labels.moveUp}
                disabled={index === 0}
                onClick={() => step(index, -1)}
                className="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <HiChevronUp aria-hidden className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={labels.moveDown}
                disabled={index === rows.length - 1}
                onClick={() => step(index, 1)}
                className="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <HiChevronDown aria-hidden className="size-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
