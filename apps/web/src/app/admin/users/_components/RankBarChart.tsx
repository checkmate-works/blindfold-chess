'use client';

import { CHART_TOOLTIP_STYLE } from '@/app/_components/chartStyles';
import { HorizontalCountBarChart } from '@/app/admin/_components/HorizontalCountBarChart';
import { Tooltip, YAxis } from 'recharts';

import type { RankStat } from '../_lib/queries';

type Props = {
  data: RankStat[];
  labels: {
    noData: string;
    users: string;
  };
  rankNames: Record<string, string>;
  onBarClick?: (slug: string) => void;
};

/**
 * Custom tick component for the Y-axis that colors each rank label
 * with its corresponding belt color.
 */
function RankTick({
  x,
  y,
  payload,
  data,
  rankNames,
}: {
  x: number;
  y: number;
  payload: { value: string };
  data: RankStat[];
  rankNames: Record<string, string>;
}) {
  const slug = payload.value;
  const stat = data.find((d) => d.slug === slug);
  const color = stat?.color ?? '#888888';

  // For white (#ffffff), use a CSS variable approach:
  // light mode -> gray fallback, dark mode -> white
  const isWhite = color.toLowerCase() === '#ffffff';

  return (
    <text
      x={x}
      y={y}
      textAnchor="end"
      dominantBaseline="central"
      fontSize={13}
      fontWeight={600}
      fill={isWhite ? undefined : color}
      className={isWhite ? 'fill-[#d1d5db] dark:fill-[#ffffff]' : undefined}
    >
      {rankNames[slug] ?? slug}
    </text>
  );
}

export function RankBarChart({ data, labels, rankNames, onBarClick }: Props) {
  return (
    <HorizontalCountBarChart
      data={data}
      isEmpty={data.length === 0}
      noDataLabel={labels.noData}
      yAxis={
        <YAxis
          type="category"
          dataKey="slug"
          width={80}
          tick={(props: Record<string, unknown>) => (
            <RankTick
              x={props.x as number}
              y={props.y as number}
              payload={props.payload as { value: string }}
              data={data}
              rankNames={rankNames}
            />
          )}
        />
      }
      tooltip={
        <Tooltip
          formatter={(value) => [`${value} ${labels.users}`, '']}
          labelFormatter={(label) => rankNames[String(label)] ?? String(label)}
          contentStyle={CHART_TOOLTIP_STYLE}
        />
      }
      onBarClick={onBarClick && ((entry: RankStat) => entry.slug && onBarClick(entry.slug))}
    />
  );
}
