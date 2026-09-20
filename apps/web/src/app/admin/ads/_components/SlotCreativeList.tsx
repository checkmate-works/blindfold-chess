'use client';

import { useRef, useState, useTransition } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { CreativeThumbnail } from '@/lib/ads/ui/CreativeThumbnail';

import {
  toggleKnobClass,
  toggleTrackClass,
} from '@/app/[locale]/_components/toggle-switch-classes';

import { AdminBadge } from '../../_components/AdminBadge';
import { reorderAdCreatives } from '../_actions/reorderAdCreatives';
import { setAdCreativeActive } from '../_actions/setAdCreativeActive';

export type SlotCreativeRow = {
  id: string;
  isActive: boolean;
  /** Its click-through is still the seeded placeholder, so it cannot be activated. */
  hasPlaceholderHref: boolean;
  /** The creative's English title; empty only for a row with no `en` copy, which the validator forbids. */
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
    copyId: string;
    copiedId: string;
    hrefNotSet: string;
    hrefNotSetHint: string;
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
 *
 * There is no delete: a creative is stopped with the active toggle and keeps
 * its row, because the row id is the sub-ID the affiliate network reports
 * clicks under — see the opening TSDoc of `@/lib/ads/subid`. Each row shows
 * that id for exactly that reason: it is what a line in the network's report
 * has to be matched against.
 */
export function SlotCreativeList({ slot, rows: initialRows, editHrefBase, labels }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  // Order at drag start, to skip the save when a drag ends where it began.
  const dragStartOrderRef = useRef<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // `navigator.clipboard` is absent on insecure origins and can reject when
  // the document is not focused; either way the id is still selectable as
  // text, so a failed copy just leaves the label alone.
  const copyId = (id: string) => {
    navigator.clipboard?.writeText(id).then(
      () => {
        setCopiedId(id);
        window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500);
      },
      () => {}
    );
  };

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

            {row.hasPlaceholderHref && (
              <span className="shrink-0" title={labels.hrefNotSetHint}>
                <AdminBadge variant="warning">{labels.hrefNotSet}</AdminBadge>
              </span>
            )}

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => copyId(row.id)}
                title={copiedId === row.id ? labels.copiedId : labels.copyId}
                aria-label={`${labels.copyId}: ${row.id}`}
                className="rounded border border-border bg-card px-2 py-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-secondary"
              >
                {copiedId === row.id ? labels.copiedId : row.id}
              </button>
              <Link
                href={`${editHrefBase}/${row.id}/edit`}
                className="rounded border border-border bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
              >
                {labels.edit}
              </Link>
            </div>

            <div className="flex shrink-0 items-center gap-2 pl-1">
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {row.isActive ? labels.active : labels.inactive}
              </span>
              {/* A placeholder creative can still be switched off, only not on:
                  `setAdCreativeActive` refuses the activation, and a control
                  that reports success optimistically and then snaps back with
                  no message reads as a glitch rather than as a rule. */}
              <button
                type="button"
                role="switch"
                aria-checked={row.isActive}
                aria-label={row.isActive ? labels.active : labels.inactive}
                disabled={row.hasPlaceholderHref && !row.isActive}
                title={row.hasPlaceholderHref && !row.isActive ? labels.hrefNotSetHint : undefined}
                onClick={() => toggleActive(row.id, !row.isActive)}
                className={`${toggleTrackClass('setting', row.isActive)} shrink-0 disabled:cursor-not-allowed disabled:opacity-50`}
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
