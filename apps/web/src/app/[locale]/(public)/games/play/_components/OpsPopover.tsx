'use client';

import { useEffect, useRef } from 'react';

import type { MoveOperationLog } from '@/lib/games/saved-game-types';

import { buildOpsRows } from '../_lib/move-ops-alignment';
import { OpsRowsList } from './OpsRowsList';

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

  const rows = buildOpsRows(log, labels);

  return (
    <div
      ref={ref}
      role="dialog"
      className="absolute z-20 right-0 top-full mt-1 min-w-[8rem] rounded-md border border-border bg-card shadow-md text-xs font-sans"
    >
      <OpsRowsList rows={rows} />
    </div>
  );
}
