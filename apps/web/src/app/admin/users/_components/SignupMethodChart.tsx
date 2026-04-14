'use client';

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { SignupMethodStat } from '../_lib/queries';

const BAR_HEIGHT = 40;
const MIN_HEIGHT = 200;

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
  const hasAny = data.some((d) => d.count > 0);
  if (!hasAny) {
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
          dataKey="method"
          width={80}
          tickFormatter={(value: string) => methodNames[value] ?? value}
        />
        <Tooltip
          formatter={(value) => [`${value} ${labels.users}`, '']}
          labelFormatter={(label) => methodNames[String(label)] ?? String(label)}
          contentStyle={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-foreground)',
          }}
        />
        <Bar
          dataKey="count"
          fill="var(--color-primary)"
          radius={[0, 4, 4, 0]}
          cursor={onBarClick ? 'pointer' : undefined}
          onClick={(_data, _index, _event) => {
            const entry = _data as unknown as SignupMethodStat;
            if (onBarClick && entry?.method) {
              onBarClick(entry.method);
            }
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
