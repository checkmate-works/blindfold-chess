'use client';

import { CHART_TOOLTIP_STYLE } from '@/app/_components/chartStyles';
import { HorizontalCountBarChart } from '@/app/admin/_components/HorizontalCountBarChart';
import { Tooltip, YAxis } from 'recharts';

import type { LevelStat } from '../_lib/queries';
import { useStatsBarClick } from './StatsChartNav';

type Props = {
  data: LevelStat[];
  labels: {
    noData: string;
    users: string;
  };
  /** Bucket id → display label (see `buildLevelBucketNames`). */
  bucketNames: Record<string, string>;
  /** Overrides the handler from the enclosing `StatsChartNav`, if any. */
  onBarClick?: (value: string) => void;
};

/**
 * Distribution of users across level bands. Every bucket is always present
 * (the aggregate fills zeros), so "empty" means the population itself is
 * empty, not that the rows are missing.
 */
export function LevelBarChart({ data, labels, bucketNames, onBarClick }: Props) {
  const contextBarClick = useStatsBarClick();
  const handleBarClick = onBarClick ?? contextBarClick;
  return (
    <HorizontalCountBarChart
      data={data}
      isEmpty={data.every((d) => d.count === 0)}
      noDataLabel={labels.noData}
      yAxis={
        <YAxis
          type="category"
          dataKey="bucket"
          width={96}
          tickFormatter={(bucket: string) => bucketNames[bucket] ?? bucket}
        />
      }
      tooltip={
        <Tooltip
          formatter={(value) => [`${value} ${labels.users}`, '']}
          labelFormatter={(label) => bucketNames[String(label)] ?? String(label)}
          contentStyle={CHART_TOOLTIP_STYLE}
        />
      }
      onBarClick={
        handleBarClick && ((entry: LevelStat) => entry.bucket && handleBarClick(entry.bucket))
      }
    />
  );
}
