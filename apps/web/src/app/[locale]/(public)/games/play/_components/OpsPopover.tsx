'use client';

import { useEffect, useRef } from 'react';

import type { MoveOperationLog } from '@/lib/games/saved-game-types';

/**
 * Small popover that lists each non-zero counter for a single move. Self
 * dismisses on outside click + Esc. Positioned absolutely relative to its
 * parent (the move row), so the parent must establish a `position:
 * relative` container.
 */
export function OpsPopover({
  log,
  onClose,
  labels,
}: {
  log: MoveOperationLog;
  onClose: () => void;
  labels: { peek: string; undo: string; hints: string; invalid: string };
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Defer one tick so the click that opens the popover does not also
    // trigger the outside-click handler that closes it.
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClick);
      window.addEventListener('keydown', handleKey);
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // `detail` carries the rejected move texts for the invalid row (e.g.
  // "Nf3, Bb4"); shown on a second line under the count so the reviewer sees
  // *what* was tried. Absent when no texts were captured (board mis-grabs or
  // legacy records) — then only the count shows.
  const rows: { label: string; value: number; detail?: string }[] = [];
  if (log.peekCount > 0) rows.push({ label: labels.peek, value: log.peekCount });
  if (log.undoCount > 0) rows.push({ label: labels.undo, value: log.undoCount });
  if ((log.movePeekCount ?? 0) > 0)
    rows.push({ label: labels.hints, value: log.movePeekCount as number });
  if ((log.invalidCount ?? 0) > 0) {
    const attempts = (log.invalidAttempts ?? []).filter((s) => typeof s === 'string');
    rows.push({
      label: labels.invalid,
      value: log.invalidCount as number,
      detail: attempts.length > 0 ? attempts.join(', ') : undefined,
    });
  }

  return (
    <div
      ref={ref}
      role="dialog"
      className="absolute z-20 right-0 top-full mt-1 min-w-[8rem] rounded-md border border-border bg-card shadow-md text-xs font-sans"
    >
      <dl className="divide-y divide-border/50">
        {rows.map(({ label, value, detail }) => (
          <div key={label} className="px-3 py-1.5">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
            {detail && (
              <div className="mt-0.5 text-right font-medium text-foreground">{detail}</div>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}
