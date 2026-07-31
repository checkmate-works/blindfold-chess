'use client';

import { useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, FormErrorBanner } from '@/app/_components';
import { UnsavedChangesDialog } from '@/app/_components/UnsavedChangesDialog';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';
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
  /** Where Save and Cancel both land — the course the owner came from. */
  detailHref: string;
  /**
   * `data-tour-id`s the page's help tour points at. The tour targets live in
   * here rather than on the page because both things it explains — the grip
   * handle and the unchanging line number — are inside a row.
   */
  tourIds: { handle: string; lineNo: string };
  labels: {
    dragHandle: string;
    moveUp: string;
    moveDown: string;
    save: string;
    saving: string;
    cancel: string;
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
 * Edits are held in client state and committed by the Save button — the same
 * submit-then-save contract as the metadata form next door, so the pair of
 * actions under the list means what it means everywhere else in the app
 * (Save commits, Cancel discards) and an arrangement can be tried out and
 * backed away from. Leaving with an uncommitted order goes through the shared
 * `useUnsavedChanges` guard rather than silently dropping it.
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
export function LineOrderList({
  repertoireId,
  rows: initialRows,
  detailHref,
  tourIds,
  labels,
}: Props) {
  const router = useRouter();
  const tUnsaved = useTranslations('unsavedChanges');
  const [rows, setRows] = useState(initialRows);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);

  const isDirty = !submitted && orderKey(rows) !== orderKey(initialRows);
  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

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
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (dragIndex === null) return;
    const over = indexAtY(e.clientY);
    if (over === null || over === dragIndex) return;
    setRows((prev) => move(prev, dragIndex, over));
    setDragIndex(over);
  }

  function handlePointerUp() {
    setDragIndex(null);
  }

  function step(index: number, delta: number) {
    const to = index + delta;
    if (to < 0 || to >= rows.length) return;
    setRows(move(rows, index, to));
  }

  async function handleSave() {
    setPending(true);
    setError(null);

    const result = await reorderLines({
      repertoireId,
      orderedLineNos: rows.map((r) => r.lineNo),
    });
    if (!result.ok) {
      setPending(false);
      setError(labels.error);
      // The submitted set no longer matches the repertoire's live lines (a line
      // deleted in another tab), or the write failed. Either way the list on
      // screen is describing a course that no longer exists — re-read it.
      router.refresh();
      return;
    }

    // flushSync so the isDirty -> false re-render completes before
    // router.push triggers the navigation guard (same as EditRepertoireForm).
    flushSync(() => setSubmitted(true));
    router.push(detailHref);
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-2">
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
              // Only the first row is a tour target — driver.js highlights one
              // element per step, and the rows are identical.
              data-tour-id={index === 0 ? tourIds.handle : undefined}
              onPointerDown={(e) => handlePointerDown(index, e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              // Without this the browser consumes a touch-drag as a scroll
              // before any pointermove reaches React.
              style={{ touchAction: 'none' }}
              className="flex size-9 flex-shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <HiBars3 aria-hidden className="size-4" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{row.label}</p>
              <p className="truncate text-xs text-muted-foreground">{row.moves}</p>
            </div>

            <span
              data-tour-id={index === 0 ? tourIds.lineNo : undefined}
              className="flex-shrink-0 text-xs tabular-nums text-foreground/40"
            >
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

      <FormErrorBanner message={error} />

      <UnsavedChangesDialog
        open={isBlocking}
        onConfirm={confirm}
        onCancel={cancel}
        title={tUnsaved('title')}
        message={tUnsaved('message')}
        confirmLabel={tUnsaved('confirm')}
        cancelLabel={tUnsaved('cancel')}
      />

      <div className="space-y-4">
        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          loading={pending}
          disabled={pending}
          onClick={handleSave}
        >
          {pending ? labels.saving : labels.save}
        </Button>
        <button
          type="button"
          onClick={() => router.push(detailHref)}
          disabled={pending}
          className="block w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          {labels.cancel}
        </button>
      </div>
    </div>
  );
}
