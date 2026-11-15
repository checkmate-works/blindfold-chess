'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

import type { MoveOperationLog } from '@/lib/games/saved-game-types';

import { buildOpsRows } from '../_lib/move-ops-alignment';
import { OpsRowsList } from './OpsRowsList';

/**
 * Small popover that lists each non-zero counter for a single move. Self
 * dismisses on outside click + Esc. Positioned absolutely relative to its
 * parent (the move row), so the parent must establish a `position:
 * relative` container.
 *
 * It opens below the row, unless that would run past the bottom of the
 * scrolling move list it sits in — the last rows of a list, or any row of a
 * short one — where it would be clipped; then it opens above the row.
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

  // Measured before paint, and applied as a data attribute rather than state
  // so the flip costs no second render.
  useLayoutEffect(() => {
    const el = ref.current;
    const scroller = el ? findScrollParent(el) : null;
    if (!el || !scroller) return;
    const popover = el.getBoundingClientRect();
    const bounds = scroller.getBoundingClientRect();
    const row = el.parentElement?.getBoundingClientRect();
    if (popover.bottom > bounds.bottom && row && row.top - popover.height >= bounds.top) {
      el.dataset.placement = 'above';
    }
  }, []);

  const rows = buildOpsRows(log, labels);

  return (
    <div
      ref={ref}
      role="dialog"
      className="absolute z-20 right-0 top-full mt-1 data-[placement=above]:top-auto data-[placement=above]:bottom-full data-[placement=above]:mt-0 data-[placement=above]:mb-1 min-w-[8rem] rounded-md border border-border bg-card shadow-md text-xs font-sans"
    >
      <OpsRowsList rows={rows} />
    </div>
  );
}

/** The nearest ancestor that scrolls vertically, i.e. the box that would clip the popover. */
function findScrollParent(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
  }
  return null;
}
