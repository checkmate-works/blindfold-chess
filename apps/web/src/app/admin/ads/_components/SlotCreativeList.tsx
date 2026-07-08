'use client';

import { useState, useTransition } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { reorderAdCreatives } from '../_actions/reorderAdCreatives';
import { CreativeDeleteButton } from './CreativeDeleteButton';

export type SlotCreativeRow = {
  id: string;
  isActive: boolean;
  targetCountry: string | null;
  /** Title (native) or alt (banner); may be empty. */
  summary: string;
  /** Preview image URL (banner image, or an image-type native thumbnail). */
  imageUrl: string | null;
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

  const handleDrop = () => {
    setDragIndex(null);
    persist(rows);
  };

  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">{labels.reorderHint}</p>
      <ul className={`space-y-2 ${isPending ? 'opacity-70' : ''}`}>
        {rows.map((row, index) => (
          <li
            key={row.id}
            draggable
            onDragStart={() => setDragIndex(index)}
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

            {row.imageUrl ? (
              <Image
                src={row.imageUrl}
                alt={row.summary}
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 rounded object-cover"
                unoptimized
              />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded bg-muted" />
            )}

            <span className="min-w-0 flex-1 truncate">{row.summary || '—'}</span>

            <span className="shrink-0 text-muted-foreground">{row.targetCountry ?? '🌐'}</span>

            <span
              className={`shrink-0 rounded px-2 py-0.5 text-xs ${
                row.isActive
                  ? 'bg-success-soft text-success-soft-foreground'
                  : 'bg-destructive-soft text-destructive-soft-foreground'
              }`}
            >
              {row.isActive ? labels.active : labels.inactive}
            </span>

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
          </li>
        ))}
      </ul>
    </div>
  );
}
