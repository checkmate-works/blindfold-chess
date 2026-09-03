import {
  DELTA_TONE_CLASSES,
  formatSignedDelta,
  signedDeltaTone,
} from '@/lib/challenge/signed-delta';

type Props = {
  label: string;
  value: string;
  sub?: string;
  /**
   * Period-over-period change, written as a signed count in the same unit as
   * `value` (`+3 vs last week`). `change: null` means there is nothing to
   * compare against (no records in the previous period) and the line is
   * omitted. Absolute, not percent: the values are small counts of correct
   * answers, where a percentage exaggerates — see `formatSignedDelta`.
   */
  comparison?: {
    change: number | null;
    label: string;
    /** Decimals to show; matches how `value` itself is formatted. */
    fractionDigits?: number;
  };
};

export function StatsCard({ label, value, sub, comparison }: Props) {
  const renderComparison = () => {
    if (!comparison || comparison.change === null) return null;

    const { change, label: compLabel, fractionDigits = 0 } = comparison;
    const tone = signedDeltaTone(change, fractionDigits);

    return (
      <p className={`text-xs mt-1 ${DELTA_TONE_CLASSES[tone]}`}>
        {formatSignedDelta(change, fractionDigits)} {compLabel}
      </p>
    );
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 min-w-0">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && !comparison && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      {renderComparison()}
    </div>
  );
}
