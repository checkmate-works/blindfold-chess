import type { ExpHeatmapData } from '../_lib/getExpHeatmapData';
import { generateDateRange, getExpLevel, getHeatmapDateRange } from '../_lib/heatmap-utils';

/**
 * CSS classes for each intensity level (0–4).
 *
 * Level 0 uses a muted background for "no activity" days.
 * Levels 1–4 use the theme primary color with increasing opacity.
 */
const LEVEL_CLASSES: Record<number, string> = {
  0: 'bg-muted',
  1: 'bg-primary/25',
  2: 'bg-primary/50',
  3: 'bg-primary/75',
  4: 'bg-primary',
};

type Props = {
  data: ExpHeatmapData;
  legendLess: string;
  legendMore: string;
};

export function ExpActivityHeatmap({ data, legendLess, legendMore }: Props) {
  const { startDate, endDate } = getHeatmapDateRange(new Date());
  const allDates = generateDateRange(startDate, endDate);

  const maxAmount = Math.max(0, ...Object.values(data));

  // Build weeks (columns) — each week is an array of up to 7 days
  const weeks: (string | null)[][] = [];
  let currentWeek: (string | null)[] = [];

  for (const dateStr of allDates) {
    const date = new Date(dateStr + 'T00:00:00Z');
    const dayOfWeek = date.getUTCDay(); // 0=Sunday

    // Start a new week on Sunday
    if (dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }

    currentWeek.push(dateStr);
  }

  // Push the last partial week
  if (currentWeek.length > 0) {
    // Pad the last week with nulls so the grid stays aligned
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-[3px] overflow-x-auto">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-[3px]">
            {week.map((dateStr, dayIdx) => {
              if (dateStr === null) {
                return <div key={`empty-${dayIdx}`} className="size-3 rounded-sm" />;
              }

              const amount = data[dateStr] ?? 0;
              const level = getExpLevel(amount, maxAmount);
              const levelClass = LEVEL_CLASSES[level] ?? LEVEL_CLASSES[0];

              return (
                <div
                  key={dateStr}
                  className={`size-3 rounded-sm ${levelClass}`}
                  title={`${dateStr}: ${amount} Exp`}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
        <span>{legendLess}</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div key={level} className={`size-3 rounded-sm ${LEVEL_CLASSES[level]}`} />
        ))}
        <span>{legendMore}</span>
      </div>
    </div>
  );
}
