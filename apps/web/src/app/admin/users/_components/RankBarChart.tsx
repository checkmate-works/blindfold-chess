'use client';

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { RankStat } from '../_lib/queries';

const BAR_HEIGHT = 40;
const MIN_HEIGHT = 200;

type Props = {
  data: RankStat[];
  labels: {
    noData: string;
    users: string;
  };
  rankNames: Record<string, string>;
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

export function RankBarChart({ data, labels, rankNames }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        {labels.noData}
      </div>
    );
  }

  const chartHeight = Math.max(data.length * BAR_HEIGHT, MIN_HEIGHT);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
        <XAxis type="number" allowDecimals={false} />
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
        <Tooltip
          formatter={(value) => [`${value} ${labels.users}`, '']}
          labelFormatter={(label) => rankNames[String(label)] ?? String(label)}
          contentStyle={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-foreground)',
          }}
        />
        <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
