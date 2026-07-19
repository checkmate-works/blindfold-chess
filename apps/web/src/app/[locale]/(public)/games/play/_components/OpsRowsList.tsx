import type { OpsRow } from '../_lib/move-ops-alignment';

/**
 * The `label: value` rows for a single move's op counters, as a plain `<dl>`
 * — no positioning of its own, so callers can drop it into a popover
 * (`OpsPopover`) or an inline block (the shared-game per-move position
 * panel) alike.
 */
export function OpsRowsList({ rows }: { rows: OpsRow[] }) {
  return (
    <dl className="divide-y divide-border/50">
      {rows.map(({ label, value, detail }) => (
        <div key={label} className="px-3 py-1.5">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
          {detail && <div className="mt-0.5 text-right font-medium text-foreground">{detail}</div>}
        </div>
      ))}
    </dl>
  );
}
