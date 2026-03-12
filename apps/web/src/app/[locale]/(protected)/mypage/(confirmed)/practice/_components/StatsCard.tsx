'use client';

type Props = {
  label: string;
  value: string;
  sub?: string;
  tooltip?: string;
  comparison?: {
    percentChange: number | null;
    absoluteChange: number | null;
    label: string;
  };
};

export function StatsCard({ label, value, sub, tooltip, comparison }: Props) {
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
      <p className={`text-xs mt-1 ${isPositive ? 'text-success' : 'text-destructive'}`}>
        {isPositive ? '\u25B2' : '\u25BC'} {displayValue} {compLabel}
      </p>
    );
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
      <p className="text-xs text-muted-foreground mb-1">
        {label}
        {tooltip && (
          <span className="relative inline-block ml-1 group">
            <span
              className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-muted-foreground/40 text-muted-foreground cursor-help text-[10px] leading-none"
              aria-label={tooltip}
            >
              i
            </span>
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs rounded bg-foreground text-background whitespace-normal w-48 text-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-10">
              {tooltip}
            </span>
          </span>
        )}
      </p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && !comparison && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      {renderComparison()}
    </div>
  );
}
