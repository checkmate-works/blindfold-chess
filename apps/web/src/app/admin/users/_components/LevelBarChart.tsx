'use client';

import { CHART_TOOLTIP_STYLE } from '@/app/_components/chartStyles';
import { HorizontalCountBarChart } from '@/app/admin/_components/HorizontalCountBarChart';
import { Tooltip, YAxis } from 'recharts';

import type { LevelStat } from '../_lib/queries';

type Props = {
  data: LevelStat[];
  labels: {
    noData: string;
    users: string;
  };
  /** Bucket id → display label (see `buildLevelBucketNames`). */
  bucketNames: Record<string, string>;
  onBarClick?: (bucket: string) => void;
};

/**
 * Distribution of users across level bands. Every bucket is always present
 * (the aggregate fills zeros), so "empty" means the population itself is
 * empty, not that the rows are missing.
 */
export function LevelBarChart({ data, labels, bucketNames, onBarClick }: Props) {
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
      onBarClick={onBarClick && ((entry: LevelStat) => entry.bucket && onBarClick(entry.bucket))}
    />
  );
}
