'use client';

import { useCallback, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import type { ExpHeatmapData } from '../_lib/getExpHeatmapData';
import { generateDateRange, getExpLevel, getHeatmapDateRangeForWeeks } from '../_lib/heatmap-utils';

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

const DESKTOP_WEEKS = 53;
const MOBILE_WEEKS = 26;

type Props = {
  data: ExpHeatmapData;
  legendLess: string;
  legendMore: string;
};

/** Builds weeks (columns) from a flat date array — each week is up to 7 days. */
function buildWeeks(allDates: string[]): (string | null)[][] {
  const weeks: (string | null)[][] = [];
  let currentWeek: (string | null)[] = [];

  for (const dateStr of allDates) {
    const date = new Date(dateStr + 'T00:00:00Z');
    const dayOfWeek = date.getUTCDay(); // 0=Sunday

    if (dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(dateStr);
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

/** Computes weeks and max amount for a given number of weeks. */
function useHeatmapWeeks(daily: Record<string, number>, totalWeeks: number) {
  return useMemo(() => {
    const { startDate, endDate } = getHeatmapDateRangeForWeeks(new Date(), totalWeeks);
    const allDates = generateDateRange(startDate, endDate);
    const max = Math.max(0, ...Object.values(daily));
    return { weeks: buildWeeks(allDates), maxAmount: max };
  }, [daily, totalWeeks]);
}

export function ExpActivityHeatmap({ data, legendLess, legendMore }: Props) {
  const t = useTranslations('Mypage');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const desktop = useHeatmapWeeks(data.daily, DESKTOP_WEEKS);
  const mobile = useHeatmapWeeks(data.daily, MOBILE_WEEKS);

  const handleCellClick = useCallback((dateStr: string) => {
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
  }, []);

  const moduleBreakdown = selectedDate ? data.dailyByModule[selectedDate] : null;
  const selectedTotal = selectedDate ? (data.daily[selectedDate] ?? 0) : 0;

  /** Renders the heatmap grid for a given configuration. */
  function renderGrid(weeks: (string | null)[][], maxAmount: number, cellSize: string) {
    return (
      <div className="flex gap-[3px] overflow-x-auto">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-[3px]">
            {week.map((dateStr, dayIdx) => {
              if (dateStr === null) {
                return <div key={`empty-${dayIdx}`} className={`${cellSize} rounded-sm`} />;
              }

              const amount = data.daily[dateStr] ?? 0;
              const level = getExpLevel(amount, maxAmount);
              const levelClass = LEVEL_CLASSES[level] ?? LEVEL_CLASSES[0];
              const isSelected = dateStr === selectedDate;

              return (
                <button
                  key={dateStr}
                  type="button"
                  className={`${cellSize} rounded-sm ${levelClass} ${isSelected ? 'ring-2 ring-foreground' : ''} cursor-pointer`}
                  title={`${dateStr}: ${amount} Exp`}
                  onClick={() => handleCellClick(dateStr)}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Desktop: 53 weeks, small cells */}
      <div className="hidden md:block">
        {renderGrid(desktop.weeks, desktop.maxAmount, 'size-3')}
      </div>
      {/* Mobile: 26 weeks, larger cells */}
      <div className="block md:hidden">{renderGrid(mobile.weeks, mobile.maxAmount, 'size-4')}</div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
        <span>{legendLess}</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div key={level} className={`size-3 rounded-sm ${LEVEL_CLASSES[level]}`} />
        ))}
        <span>{legendMore}</span>
      </div>

      {/* Detail panel */}
      {selectedDate && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <p className="font-semibold text-foreground">
            {new Date(selectedDate + 'T00:00:00Z').toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              timeZone: 'UTC',
            })}
          </p>
          <p className="mt-1 text-muted-foreground">
            {t('dashboard.heatmapTotal')}: {selectedTotal} Exp
          </p>
          {moduleBreakdown && Object.keys(moduleBreakdown).length > 0 ? (
            <ul className="mt-2 space-y-1">
              {Object.entries(moduleBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([moduleKey, exp]) => (
                  <li key={moduleKey} className="flex justify-between text-muted-foreground">
                    <span>{t(`menuTypes.${moduleKey}` as Parameters<typeof t>[0])}</span>
                    <span>{exp} Exp</span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="mt-2 text-muted-foreground">{t('dashboard.heatmapNoActivity')}</p>
          )}
        </div>
      )}
    </div>
  );
}
