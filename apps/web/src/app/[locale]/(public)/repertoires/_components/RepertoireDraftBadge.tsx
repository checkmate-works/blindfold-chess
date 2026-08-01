type Props = {
  label: string;
  /** Tooltip spelling out the consequence — "only you can see this". */
  hint?: string;
};

/**
 * The "draft" pill for an unpublished (`building`) kata. Single-sourced
 * because it appears both next to the page title on the detail page (the
 * chunk detail page puts its draft badge in the same slot) and inside
 * `RepertoireChips` on the catalog cards, and the two must not drift.
 *
 * Its status is stored as `building`, not `draft` — the DB value predates the
 * label and stays put (same read-layer mapping the chunk statuses use).
 */
export function RepertoireDraftBadge({ label, hint }: Props) {
  return (
    <span
      className="inline-flex items-center rounded-full bg-warning-soft px-2 py-0.5 text-xs text-warning-soft-foreground"
      title={hint}
    >
      {label}
    </span>
  );
}
