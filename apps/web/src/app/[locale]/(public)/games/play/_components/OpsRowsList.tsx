import { FaTimes } from 'react-icons/fa';

import type { OpsRow } from '../_lib/move-ops-alignment';

const CHIP_CLASSES =
  'inline-flex items-center gap-1 rounded-full border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-xs text-destructive';

/**
 * The `label: value` rows for a single move's op counters, as a plain `<dl>`
 * — no positioning of its own, so callers can drop it into a popover
 * (`OpsPopover`) or an inline block (the shared-game per-move position
 * panel) alike.
 *
 * The invalid row's rejected SAN attempts render as one red "✗ move" chip each
 * (soft-destructive tint, monospace notation) — matching the illegal marker's
 * red elsewhere (EffortStrip, the puzzle FeedbackChip) and making each rejected
 * move individually scannable rather than a comma-joined run. When chips are
 * shown the numeric count is dropped — the chips already convey it; the count
 * is kept only for a chip-less row (a legacy / SAN-less board count).
 *
 * Row padding (`px-4 py-3`) matches the app's other rounded-border divide-y
 * list, the coin-history table.
 */
export function OpsRowsList({
  rows,
  onAttemptSelect,
  selectedAttemptIndex = null,
  isAttemptSelectable,
}: {
  rows: OpsRow[];
  /**
   * Opt-in: makes each rejected-move chip a button reporting its index within
   * the move's `invalidAttempts`. Left undefined (live play) the chips stay
   * inert text — there is no board to point at mid-game, and the player is
   * not reviewing.
   */
  onAttemptSelect?: (attemptIndex: number) => void;
  /** Index of the chip currently being shown on the board, if any. */
  selectedAttemptIndex?: number | null;
  /**
   * Whether a given attempt can be pointed at — false when its squares
   * cannot be recovered, so it renders inert rather than as a button that
   * does nothing when pressed.
   */
  isAttemptSelectable?: (attemptIndex: number) => boolean;
}) {
  return (
    <dl className="divide-y divide-border/50">
      {rows.map(({ label, value, attempts }) => {
        const hasChips = attempts != null && attempts.length > 0;
        return (
          <div key={label} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">{label}</dt>
              {!hasChips && <dd className="font-medium">{value}</dd>}
            </div>
            {hasChips && (
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {attempts.map((san, i) => {
                  const selectable = onAttemptSelect && (isAttemptSelectable?.(i) ?? true);
                  const body = (
                    <>
                      <FaTimes className="h-2.5 w-2.5 shrink-0" aria-hidden />
                      <span className="font-mono">{san}</span>
                    </>
                  );
                  if (!selectable) {
                    return (
                      <span key={`${san}-${i}`} className={CHIP_CLASSES}>
                        {body}
                      </span>
                    );
                  }
                  const isSelected = selectedAttemptIndex === i;
                  return (
                    <button
                      key={`${san}-${i}`}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onAttemptSelect(i)}
                      className={`${CHIP_CLASSES} cursor-pointer transition-colors hover:bg-destructive/20 ${
                        isSelected ? 'ring-2 ring-destructive/50' : ''
                      }`}
                    >
                      {body}
                    </button>
                  );
                })}
              </dd>
            )}
          </div>
        );
      })}
    </dl>
  );
}
