export type ProgressBarSegment = {
  key: string;
  value: number;
  color: string; // Tailwind class like 'bg-green-600'
  label?: string; // Legend label
  textColor?: string; // Optional text color, defaults to 'text-white'
};

type Props = {
  segments: ProgressBarSegment[];
  total: number;
  height?: string; // Tailwind height class, default 'h-8'
  showLegend?: boolean;
  className?: string;
};

export function SegmentedProgressBar({
  segments,
  total,
  height = 'h-8',
  showLegend = true,
  className = '',
}: Props) {
  // Filter out segments with value 0 to avoid rendering empty blocks
  const activeSegments = segments.filter((s) => s.value > 0);

  return (
    <div className={`w-full ${className}`}>
      {/* Progress Bar */}
      <div className={`w-full bg-muted rounded-lg overflow-hidden flex ${height}`}>
        {activeSegments.map((segment) => {
          const widthPercentage = total > 0 ? (segment.value / total) * 100 : 0;
          return (
            <div
              key={segment.key}
              className={`${segment.color} flex items-center justify-center text-sm font-semibold ${
                segment.textColor || 'text-white'
              }`}
              style={{ width: `${widthPercentage}%` }}
              title={`${segment.label || segment.key}: ${segment.value}`}
            >
              {segment.value}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex justify-between mt-2 text-xs">
          {segments.map((segment) => {
            if (!segment.label) return null;
            return (
              <div key={segment.key} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded ${segment.color}`}></div>
                <span>
                  {segment.label}: {segment.value}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
