'use client';

import { useMemo, useRef, useState, useTransition } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { CreativeThumbnail } from '@/lib/ads/ui/CreativeThumbnail';
import { countryCodeToFlag } from '@/lib/countries';

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
  targetCountry: string | null;
  /** Title (native) or alt (banner); may be empty. */
  summary: string;
  /** Override/banner image URL; takes priority over the board when set. */
  imageUrl: string | null;
  /** Board FEN for native cards (null for banners); rendered when no image. */
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
    filterAll: string;
    filterReorderHint: string;
  };
};

const ALL = '__all__';

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
  const [country, setCountry] = useState<string>(ALL);
  const [isPending, startTransition] = useTransition();

  // The distinct countries actually targeted in this slot — the only filter
  // options worth offering (plus "all").
  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const r of initialRows) if (r.targetCountry) set.add(r.targetCountry);
    return [...set].sort();
  }, [initialRows]);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
        {labels.empty}
      </div>
    );
  }

  // A country's viewers see global (null) creatives plus that country's. When
  // filtered, the list is read-only: reordering a country-scoped projection of
  // a single global order is ambiguous, so we only allow DnD on the full list.
  const filtering = country !== ALL;
  const displayed = filtering
    ? rows.filter((r) => r.targetCountry === null || r.targetCountry === country)
    : rows;

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
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {filtering ? labels.filterReorderHint : labels.reorderHint}
        </p>
        {countries.length > 0 && (
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground"
          >
            <option value={ALL}>{labels.filterAll}</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {countryCodeToFlag(c)} {c}
              </option>
            ))}
          </select>
        )}
      </div>
      <ul className={`space-y-2 ${isPending ? 'opacity-70' : ''}`}>
        {displayed.map((row, index) => (
          <li
            key={row.id}
            draggable={!filtering}
            onDragStart={() => {
              if (filtering) return;
              setDragIndex(index);
              dragStartOrderRef.current = rows.map((r) => r.id).join(',');
            }}
            onDragOver={(e) => {
              if (filtering) return;
              e.preventDefault();
              if (dragIndex === null || dragIndex === index) return;
              setRows((prev) => move(prev, dragIndex, index));
              setDragIndex(index);
            }}
            onDrop={filtering ? undefined : handleDrop}
            onDragEnd={filtering ? undefined : handleDrop}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
          >
            <span
              aria-hidden
              className={`select-none px-1 text-muted-foreground ${
                filtering ? 'opacity-30' : 'cursor-grab'
              }`}
              title={filtering ? labels.filterReorderHint : labels.reorderHint}
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

            <span className="shrink-0 whitespace-nowrap text-muted-foreground">
              {row.targetCountry
                ? `${countryCodeToFlag(row.targetCountry)} ${row.targetCountry}`
                : '🌐'}
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
