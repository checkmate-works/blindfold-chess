'use client';

import { useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, FormErrorBanner } from '@/app/_components';
import { UnsavedChangesDialog } from '@/app/_components/UnsavedChangesDialog';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';
import { HiBars3, HiChevronDown, HiChevronUp, HiPlus, HiXMark } from 'react-icons/hi2';

import { REPERTOIRE_CHAPTER_NAME_MAX } from '@/lib/repertoires/line-order';

import { reorderLines } from '../../_actions/reorderLines';
import type { ArrangeRow } from './arrangement-rows';
import {
  appendChapter,
  arrangementKey,
  blockAt,
  isArrangementValid,
  moveBlock,
  removeChapter,
  resolveDropTarget,
  rowKey,
  toArrangementItems,
} from './arrangement-rows';

export type { ArrangeRow, LineOrderRow } from './arrangement-rows';

type Props = {
  repertoireId: string;
  rows: ArrangeRow[];
  /** Where Save and Cancel both land — the course the owner came from. */
  detailHref: string;
  /**
   * `data-tour-id`s the page's help tour points at. The tour targets live in
   * here rather than on the page because everything it explains — the grip
   * handle, the unchanging line number, the chapter heading — is inside a row.
   */
  tourIds: { handle: string; lineNo: string; chapter: string };
  labels: {
    dragHandle: string;
    moveUp: string;
    moveDown: string;
    unfiled: string;
    addChapter: string;
    chapterName: string;
    newChapterName: string;
    removeChapter: string;
    save: string;
    saving: string;
    cancel: string;
    error: string;
  };
};

/**
 * The owner's arrange surface for a repertoire: chapter headings, the unfiled
 * divider, and the lines themselves in one flat, draggable column.
 *
 * One column rather than nested containers because it collapses two operations
 * into one gesture — dragging a line under a different heading re-files it AND
 * positions it, with no separate "move to chapter" control to find. The cost is
 * that grouping is positional, so the rules that keep it coherent (a chapter
 * drags with its lines; headings stay above the divider) live in
 * `arrangement-rows.ts`, where they can be read and tested apart from the
 * pointer handling.
 *
 * Edits are held in client state and committed by the Save button — the same
 * submit-then-save contract as the metadata form next door, so the pair of
 * actions under the list means what it means everywhere else in the app
 * (Save commits, Cancel discards) and an arrangement can be tried out and
 * backed away from. Leaving with an uncommitted arrangement goes through the
 * shared `useUnsavedChanges` guard rather than silently dropping it.
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
 * Line numbers never change — see the schema's `line_no` note — so an arranged
 * list legitimately reads "#3, #1, #2". That is identity, not a stale render.
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
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);

  const isDirty = !submitted && arrangementKey(rows) !== arrangementKey(initialRows);
  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });
  // The server rejects a blank chapter name; catching it here keeps the owner
  // from losing a whole arrangement to a heading they never got round to naming.
  const hasBlankChapter = rows.some((row) => row.kind === 'chapter' && !row.name.trim());

  /** Which row the pointer is over, in the CURRENT display order. */
  function indexAtY(clientY: number): number | null {
    for (let i = 0; i < rowRefs.current.length; i++) {
      const el = rowRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) return i;
    }
    return null;
  }

  function handlePointerDown(row: ArrangeRow, e: React.PointerEvent<HTMLButtonElement>) {
    // Claim the gesture so the browser doesn't turn it into a scroll or a
    // text selection, and keep receiving moves even outside the handle.
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragKey(rowKey(row));
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (dragKey === null) return;
    const over = indexAtY(e.clientY);
    if (over === null) return;
    setRows((prev) => {
      const from = prev.findIndex((row) => rowKey(row) === dragKey);
      if (from === -1) return prev;
      const [start, end] = blockAt(prev, from);
      // Inside the block being dragged: nothing to do, and moving onto it would
      // fight the pointer.
      if (over >= start && over <= end) return prev;
      const next = moveBlock(prev, start, end, resolveDropTarget(prev, start, end, over));
      return isArrangementValid(next) ? next : prev;
    });
  }

  function handlePointerUp() {
    setDragKey(null);
  }

  function step(index: number, delta: number) {
    setRows((prev) => {
      const [start, end] = blockAt(prev, index);
      const target = delta < 0 ? start - 1 : end + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = moveBlock(prev, start, end, target);
      return isArrangementValid(next) ? next : prev;
    });
  }

  function renameChapter(key: string, name: string) {
    setRows((prev) =>
      prev.map((row) => (row.kind === 'chapter' && row.key === key ? { ...row, name } : row))
    );
  }

  async function handleSave() {
    setPending(true);
    setError(null);

    const result = await reorderLines({ repertoireId, items: toArrangementItems(rows) });
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
    // The confirmation lands on the course page, not here — the save's whole
    // point is that it takes you back, and a toast on a page you're leaving
    // would be gone before it was read. `ToastContainer` picks the param up
    // there and strips it from the URL.
    router.push(`${detailHref}?toast=lines_reordered` as typeof detailHref);
  }

  const gripClass =
    'flex size-9 flex-shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';
  const stepClass =
    'flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <div className="space-y-6">
      <ul className="space-y-2">
        {rows.map((row, index) => {
          const key = rowKey(row);
          const dragging = key === dragKey;
          const setRowRef = (el: HTMLLIElement | null) => {
            rowRefs.current[index] = el;
          };
          const grip = (tourId?: string) => (
            <button
              type="button"
              aria-label={labels.dragHandle}
              data-tour-id={tourId}
              onPointerDown={(e) => handlePointerDown(row, e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              // Without this the browser consumes a touch-drag as a scroll
              // before any pointermove reaches React.
              style={{ touchAction: 'none' }}
              className={gripClass}
            >
              <HiBars3 aria-hidden className="size-4" />
            </button>
          );
          const steps = (
            <div className="flex flex-shrink-0 flex-col">
              <button
                type="button"
                aria-label={labels.moveUp}
                disabled={index === 0}
                onClick={() => step(index, -1)}
                className={stepClass}
              >
                <HiChevronUp aria-hidden className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={labels.moveDown}
                disabled={index === rows.length - 1}
                onClick={() => step(index, 1)}
                className={stepClass}
              >
                <HiChevronDown aria-hidden className="size-3.5" />
              </button>
            </div>
          );

          if (row.kind === 'unfiled') {
            return (
              <li
                key={key}
                ref={setRowRef}
                className="flex items-center gap-2 pt-2 text-xs text-muted-foreground"
              >
                <span className="h-px flex-1 bg-border" />
                {labels.unfiled}
                <span className="h-px flex-1 bg-border" />
              </li>
            );
          }

          if (row.kind === 'chapter') {
            return (
              <li
                key={key}
                ref={setRowRef}
                data-tour-id={index === 0 ? tourIds.chapter : undefined}
                className={`flex items-center gap-2 rounded-lg border bg-muted/40 px-2 py-2 ${
                  dragging ? 'border-link-primary shadow-sm' : 'border-border'
                }`}
              >
                {grip()}
                <input
                  value={row.name}
                  onChange={(e) => renameChapter(row.key, e.target.value)}
                  maxLength={REPERTOIRE_CHAPTER_NAME_MAX}
                  aria-label={labels.chapterName}
                  placeholder={labels.newChapterName}
                  className={`min-w-0 flex-1 rounded border bg-card px-2 py-1 text-sm font-medium text-foreground ${
                    row.name.trim() ? 'border-transparent' : 'border-destructive'
                  }`}
                />
                <button
                  type="button"
                  aria-label={labels.removeChapter}
                  onClick={() => setRows((prev) => removeChapter(prev, row.key))}
                  className="flex size-7 flex-shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                >
                  <HiXMark aria-hidden className="size-4" />
                </button>
                {steps}
              </li>
            );
          }

          return (
            <li
              key={key}
              ref={setRowRef}
              className={`ml-4 flex items-center gap-2 rounded-lg border bg-card px-2 py-2 ${
                dragging ? 'border-link-primary shadow-sm' : 'border-border'
              }`}
            >
              {grip(index === 0 ? tourIds.handle : undefined)}

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

              {steps}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => setRows((prev) => appendChapter(prev, ''))}
        className="flex items-center gap-1.5 text-sm text-link-primary transition-colors hover:underline"
      >
        <HiPlus aria-hidden className="size-4" />
        {labels.addChapter}
      </button>

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
          disabled={pending || hasBlankChapter}
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
