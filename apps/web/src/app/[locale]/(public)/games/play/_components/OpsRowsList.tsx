import { FaTimes } from 'react-icons/fa';

import type { OpsRow } from '../_lib/move-ops-alignment';

/**
 * The `label: value` rows for a single move's op counters, as a plain `<dl>`
 * — no positioning of its own, so callers can drop it into a popover
 * (`OpsPopover`) or an inline block (the shared-game per-move position
 * panel) alike.
 *
 * The invalid row's rejected SAN attempts render as one red "✗ move" chip each
 * (soft-destructive tint, monospace notation) — matching the illegal marker's
 * red elsewhere (EffortStrip, the puzzle FeedbackChip) and making each rejected
 * move individually scannable rather than a comma-joined run.
 */
export function OpsRowsList({ rows }: { rows: OpsRow[] }) {
  return (
    <dl className="divide-y divide-border/50">
      {rows.map(({ label, value, attempts }) => (
        <div key={label} className="px-3 py-1.5">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
          {attempts && attempts.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {attempts.map((san, i) => (
                <span
                  key={`${san}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-xs text-destructive"
                >
                  <FaTimes className="h-2.5 w-2.5 shrink-0" aria-hidden />
                  <span className="font-mono">{san}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </dl>
  );
}
