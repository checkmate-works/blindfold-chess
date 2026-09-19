'use client';

import { useRef, useState, useTransition } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { CreativeThumbnail } from '@/lib/ads/ui/CreativeThumbnail';

import {
  toggleKnobClass,
  toggleTrackClass,
} from '@/app/[locale]/_components/toggle-switch-classes';

import { reorderAdCreatives } from '../_actions/reorderAdCreatives';
import { setAdCreativeActive } from '../_actions/setAdCreativeActive';
import { CreativeDeleteButton } from './CreativeDeleteButton';

export type SlotCreativeRow = {
  id: string;
  isActive: boolean;
  /** The card's title; empty when the stored payload fails its guard. */
  summary: string;
  /** Thumbnail override image; takes priority over the board when set. */
  imageUrl: string | null;
  /** Thumbnail board FEN; rendered when there is no override image. */
  boardFen: string | null;
};

type Props = {
  slot: string;
  rows: SlotCreativeRow[];
  editHrefBase: string;
  labels: {
    active: string;
    inactive: string;
    edit: string;
    delete: string;
    deleting: string;
    confirm: string;
    reorderHint: string;
    empty: string;
  };
};

function move<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Drag-and-drop reorderable list of a slot's creatives. Order is implicit in
 * the row position (no numeric field); dropping persists the new order via
 * {@link reorderAdCreatives}. Uses native HTML5 drag events — sufficient for
 * this desktop-only admin surface, no external DnD dependency. On a failed
 * save the server order is restored via `router.refresh()`.
 */
export function SlotCreativeList({ slot, rows: initialRows, editHrefBase, labels }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  // Order at drag start, to skip the save when a drag ends where it began.
  const dragStartOrderRef = useRef<string>('');
  const [isPending, startTransition] = useTransition();

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
        {labels.empty}
      </div>
    );
  }

  const persist = (ordered: SlotCreativeRow[]) => {
    startTransition(async () => {
      const result = await reorderAdCreatives(
        slot,
        ordered.map((r) => r.id)
      );
      // On failure, snap back to the authoritative server order.
      if ('error' in result) router.refresh();
    });
  };

  // Fires for both `drop` (on the target row) and `dragend` (on the source
  // row); the null-check makes whichever arrives second a no-op, so one drag
  // never persists twice.
  const handleDrop = () => {
    if (dragIndex === null) return;
    setDragIndex(null);
    if (rows.map((r) => r.id).join(',') === dragStartOrderRef.current) return;
    persist(rows);
  };

  const toggleActive = (id: string, next: boolean) => {
    // Optimistic; snap back on failure.
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, isActive: next } : r)));
    startTransition(async () => {
      const result = await setAdCreativeActive(id, next);
      if ('error' in result) router.refresh();
    });
  };

  return (
    <div>
      <div className="mb-2">
        <p className="text-xs text-muted-foreground">{labels.reorderHint}</p>
      </div>
      <ul className={`space-y-2 ${isPending ? 'opacity-70' : ''}`}>
        {rows.map((row, index) => (
          <li
            key={row.id}
            draggable
            onDragStart={() => {
              setDragIndex(index);
              dragStartOrderRef.current = rows.map((r) => r.id).join(',');
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragIndex === null || dragIndex === index) return;
              setRows((prev) => move(prev, dragIndex, index));
              setDragIndex(index);
            }}
            onDrop={handleDrop}
            onDragEnd={handleDrop}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
          >
            <span
              aria-hidden
              className="cursor-grab select-none px-1 text-muted-foreground"
              title={labels.reorderHint}
            >
              ⠿
            </span>

            <CreativeThumbnail
              imagePath={row.imageUrl}
              imageAlt={row.summary}
              fen={row.boardFen}
              imageSize={48}
              className="h-12 w-12 shrink-0 overflow-hidden rounded border border-border"
            />

            <span className="min-w-0 flex-1 truncate">{row.summary || '—'}</span>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`${editHrefBase}/${row.id}/edit`}
                className="rounded border border-border bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
              >
                {labels.edit}
              </Link>
              <CreativeDeleteButton
                id={row.id}
                labels={{
                  delete: labels.delete,
                  deleting: labels.deleting,
                  confirm: labels.confirm,
                }}
              />
            </div>

            <div className="flex shrink-0 items-center gap-2 pl-1">
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {row.isActive ? labels.active : labels.inactive}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={row.isActive}
                aria-label={row.isActive ? labels.active : labels.inactive}
                onClick={() => toggleActive(row.id, !row.isActive)}
                className={`${toggleTrackClass('setting', row.isActive)} shrink-0`}
              >
                <span className={toggleKnobClass('setting', row.isActive)} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
