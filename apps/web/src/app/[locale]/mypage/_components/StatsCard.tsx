'use client';

type Props = {
  label: string;
  value: string;
  sub?: string;
  comparison?: {
    percentChange: number | null;
    absoluteChange: number | null;
    label: string;
  };
};

export function StatsCard({ label, value, sub, comparison }: Props) {
  const renderComparison = () => {
    if (!comparison) return null;

    const { percentChange, absoluteChange, label: compLabel } = comparison;

    if (percentChange === null && absoluteChange === null) return null;

    const displayValue =
      percentChange !== null
        ? `${Math.abs(Math.round(percentChange * 10) / 10)}%`
        : `${Math.abs(absoluteChange!)}`;

    const changeValue = percentChange ?? absoluteChange ?? 0;

    if (changeValue === 0) {
      return <p className="text-xs text-muted-foreground mt-1">&mdash; {compLabel}</p>;
    }

    const isPositive = changeValue > 0;

    return (
      <p
        className={`text-xs mt-1 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
      >
        {isPositive ? '\u25B2' : '\u25BC'} {displayValue} {compLabel}
      </p>
    );
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && !comparison && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      {renderComparison()}
    </div>
  );
}
