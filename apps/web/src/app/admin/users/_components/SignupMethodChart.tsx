'use client';

import { CHART_TOOLTIP_STYLE } from '@/app/_components/chartStyles';
import { HorizontalCountBarChart } from '@/app/admin/_components/HorizontalCountBarChart';
import { Tooltip, YAxis } from 'recharts';

import type { SignupMethodStat } from '../_lib/queries';
import { useStatsBarClick } from './StatsChartNav';

type Props = {
  data: SignupMethodStat[];
  labels: {
    noData: string;
    users: string;
  };
  methodNames: Record<string, string>;
  /** Overrides the handler from the enclosing `StatsChartNav`, if any. */
  onBarClick?: (value: string) => void;
};

export function SignupMethodChart({ data, labels, methodNames, onBarClick }: Props) {
  const contextBarClick = useStatsBarClick();
  const handleBarClick = onBarClick ?? contextBarClick;
  return (
    <HorizontalCountBarChart
      data={data}
      // Every signup method is always present as a bucket, so "empty" here
      // means every bucket is zero, not that there are no rows.
      isEmpty={!data.some((d) => d.count > 0)}
      noDataLabel={labels.noData}
      yAxis={
        <YAxis
          type="category"
          dataKey="method"
          width={80}
          tickFormatter={(value: string) => methodNames[value] ?? value}
        />
      }
      tooltip={
        <Tooltip
          formatter={(value) => [`${value} ${labels.users}`, '']}
          labelFormatter={(label) => methodNames[String(label)] ?? String(label)}
          contentStyle={CHART_TOOLTIP_STYLE}
        />
      }
      onBarClick={
        handleBarClick &&
        ((entry: SignupMethodStat) => entry.method && handleBarClick(entry.method))
      }
    />
  );
}
