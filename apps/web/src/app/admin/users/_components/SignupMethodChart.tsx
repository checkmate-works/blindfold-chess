'use client';

import { CHART_TOOLTIP_STYLE } from '@/app/_components/chartStyles';
import { HorizontalCountBarChart } from '@/app/admin/_components/HorizontalCountBarChart';
import { Tooltip, YAxis } from 'recharts';

import type { SignupMethodStat } from '../_lib/queries';

type Props = {
  data: SignupMethodStat[];
  labels: {
    noData: string;
    users: string;
  };
  methodNames: Record<string, string>;
  onBarClick?: (method: string) => void;
};

export function SignupMethodChart({ data, labels, methodNames, onBarClick }: Props) {
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
        onBarClick && ((entry: SignupMethodStat) => entry.method && onBarClick(entry.method))
      }
    />
  );
}
