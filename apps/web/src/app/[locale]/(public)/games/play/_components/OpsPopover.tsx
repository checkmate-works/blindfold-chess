'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { createPortal } from 'react-dom';

import type { MoveOperationLog } from '@/lib/games/saved-game-types';

import { buildOpsRows } from '../_lib/move-ops-alignment';
import { placePopover } from '../_lib/popover-placement';
import { OpsRowsList } from './OpsRowsList';

/**
 * Small popover that lists each non-zero counter for a single move. Self
 * dismisses on outside click, Esc, scroll and resize.
 *
 * It is rendered into `document.body` with fixed positioning, next to the
 * element it is placed in (the move's cell), rather than absolutely inside
 * that cell: the move list scrolls in a box of its own, and an absolutely
 * positioned popover would be clipped by it — on a short list, the early
 * game, it fits neither below nor above its row. Positions are viewport
 * coordinates, so it closes on any scroll instead of drifting off its row.
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
  const anchorRef = useRef<HTMLSpanElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

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
    // Capture, so a scroll of the move list itself (which does not bubble)
    // closes it too.
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  // Measured before paint: the first render lays the popover out hidden at
  // the viewport origin so its size is known, then this places it.
  useLayoutEffect(() => {
    const cell = anchorRef.current?.parentElement;
    const el = ref.current;
    if (!cell || !el) return;
    const { width, height } = el.getBoundingClientRect();
    setPosition(
      placePopover(
        cell.getBoundingClientRect(),
        { width, height },
        { width: window.innerWidth, height: window.innerHeight }
      )
    );
  }, []);

  const rows = buildOpsRows(log, labels);

  return (
    <>
      <span ref={anchorRef} hidden />
      {createPortal(
        <div
          ref={ref}
          role="dialog"
          style={position ?? { top: 0, left: 0, visibility: 'hidden' }}
          className="fixed z-50 min-w-[8rem] rounded-md border border-border bg-card shadow-md text-xs font-sans"
        >
          <OpsRowsList rows={rows} />
        </div>,
        document.body
      )}
    </>
  );
}
