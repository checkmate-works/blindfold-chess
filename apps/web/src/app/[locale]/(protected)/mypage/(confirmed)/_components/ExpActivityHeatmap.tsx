'use client';

import { useCallback, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';

import type { ExpHeatmapData } from '../_lib/getExpHeatmapData';
import {
  DESKTOP_WEEKS,
  buildWeeks,
  generateDateRange,
  getExpLevel,
  getHeatmapDateRangeForWeeks,
  getMonthLabelsForWeeks,
  getRecentDays,
} from '../_lib/heatmap-utils';

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

const BAR_CHART_DAYS = 7;
const BAR_CHART_HEIGHT_PX = 140;
const BAR_CHART_MIN_HEIGHT_PX = 4;

type Props = {
  data: ExpHeatmapData;
  legendLess: string;
  legendMore: string;
};

/** Short month names for month labels. */
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Day-of-week labels — only Mon (1), Wed (3), Fri (5) are shown. */
const DAY_LABELS: Record<number, string> = { 1: 'Mon', 3: 'Wed', 5: 'Fri' };

/** Computes weeks, max amount, and month labels for a given number of weeks. */
function useHeatmapWeeks(daily: Record<string, number>, totalWeeks: number) {
  return useMemo(() => {
    const { startDate, endDate } = getHeatmapDateRangeForWeeks(new Date(), totalWeeks);
    const allDates = generateDateRange(startDate, endDate);
    const max = Math.max(0, ...Object.values(daily));
    const weeks = buildWeeks(allDates);
    const monthLabels = getMonthLabelsForWeeks(weeks, MONTH_NAMES);
    return { weeks, maxAmount: max, monthLabels };
  }, [daily, totalWeeks]);
}

export function ExpActivityHeatmap({ data, legendLess, legendMore }: Props) {
  const t = useTranslations('Mypage');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const desktop = useHeatmapWeeks(data.daily, DESKTOP_WEEKS);

  const recentDays = useMemo(() => getRecentDays(new Date(), BAR_CHART_DAYS), []);

  const handleCellClick = useCallback((dateStr: string) => {
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
  }, []);

  const moduleBreakdown = selectedDate ? data.dailyByModule[selectedDate] : null;
  const selectedTotal = selectedDate ? (data.daily[selectedDate] ?? 0) : 0;

  /** Renders the GitHub-style heatmap grid with month/day labels. */
  function renderDesktopGrid(
    weeks: (string | null)[][],
    maxAmount: number,
    monthLabels: { weekIdx: number; label: string }[]
  ) {
    return (
      <div className="inline-grid" style={{ gridTemplateColumns: 'auto 1fr' }}>
        {/* Top-left spacer (above day labels, left of month labels) */}
        <div />
        {/* Month labels row */}
        <div className="flex gap-[3px]">
          {weeks.map((_, weekIdx) => {
            const monthLabel = monthLabels.find((m) => m.weekIdx === weekIdx);
            return (
              <div key={weekIdx} className="size-3 text-xs text-muted-foreground leading-none">
                {monthLabel ? monthLabel.label : ''}
              </div>
            );
          })}
        </div>

        {/* Day labels + cells — one row per day of week (0=Sun .. 6=Sat) */}
        {Array.from({ length: 7 }, (_, dayIdx) => (
          <div key={dayIdx} className="contents">
            {/* Day-of-week label */}
            <div className="flex h-3 items-center pr-1.5 text-xs text-muted-foreground leading-none">
              {DAY_LABELS[dayIdx] ?? ''}
            </div>
            {/* Cells for this day across all weeks */}
            <div className="flex gap-[3px]">
              {weeks.map((week, weekIdx) => {
                const dateStr = week[dayIdx] ?? null;
                if (dateStr === null) {
                  return <div key={`empty-${weekIdx}`} className="size-3 rounded-sm" />;
                }

                const amount = data.daily[dateStr] ?? 0;
                const level = getExpLevel(amount, maxAmount);
                const levelClass = LEVEL_CLASSES[level] ?? LEVEL_CLASSES[0];
                const isSelected = dateStr === selectedDate;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    className={`size-3 rounded-sm ${levelClass} ${isSelected ? 'ring-2 ring-foreground' : ''} cursor-pointer`}
                    title={`${dateStr}: ${amount} Exp`}
                    onClick={() => handleCellClick(dateStr)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  /** Renders the mobile bar chart for the recent 7 days. */
  function renderBarChart() {
    const maxAmount = Math.max(0, ...recentDays.map((d) => data.daily[d] ?? 0));

    return (
      <div className="flex items-end gap-2" style={{ height: `${BAR_CHART_HEIGHT_PX}px` }}>
        {recentDays.map((dateStr) => {
          const amount = data.daily[dateStr] ?? 0;
          const ratio = maxAmount > 0 ? amount / maxAmount : 0;
          const barHeight =
            amount > 0
              ? Math.max(BAR_CHART_MIN_HEIGHT_PX, Math.round(ratio * (BAR_CHART_HEIGHT_PX - 24)))
              : BAR_CHART_MIN_HEIGHT_PX;
          const isSelected = dateStr === selectedDate;
          const dateLabel = formatBarLabel(dateStr);

          return (
            <div key={dateStr} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">{amount}</span>
              <button
                type="button"
                className={`w-full rounded-t bg-primary cursor-pointer ${isSelected ? 'ring-2 ring-foreground' : ''}`}
                style={{ height: `${barHeight}px` }}
                title={`${dateStr}: ${amount} Exp`}
                onClick={() => handleCellClick(dateStr)}
              />
              <span className="text-xs text-muted-foreground">{dateLabel}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Desktop: 50 weeks, GitHub-style heatmap */}
      <div className="hidden overflow-x-auto md:block">
        {renderDesktopGrid(desktop.weeks, desktop.maxAmount, desktop.monthLabels)}
      </div>
      {/* Mobile: 7-day bar chart */}
      <div className="block md:hidden">{renderBarChart()}</div>

      {/* Legend — desktop only */}
      <div className="hidden items-center justify-between text-xs text-muted-foreground md:flex">
        <Link href="/faq#exp-system" className="text-xs text-muted-foreground hover:underline">
          {t('dashboard.heatmapLearnLink')}
        </Link>
        <div className="flex items-center gap-1.5">
          <span>{legendLess}</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <div key={level} className={`size-3 rounded-sm ${LEVEL_CLASSES[level]}`} />
          ))}
          <span>{legendMore}</span>
        </div>
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

/**
 * Formats a YYYY-MM-DD string as a short date label (M/D).
 * Uses numeric parsing to avoid locale-dependent formatting issues.
 */
function formatBarLabel(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}/${Number(d)}`;
}
