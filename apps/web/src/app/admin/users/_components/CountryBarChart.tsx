'use client';

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { countryCodeToFlag } from '@/lib/countries';

import type { CountryStat } from '../_lib/queries';

const BAR_HEIGHT = 40;
const MIN_HEIGHT = 200;

type Props = {
  data: CountryStat[];
  labels: {
    noData: string;
    users: string;
  };
};

export function CountryBarChart({ data, labels }: Props) {
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
          dataKey="country"
          width={80}
          tickFormatter={(code: string) => `${countryCodeToFlag(code)} ${code}`}
        />
        <Tooltip
          formatter={(value) => [`${value} ${labels.users}`, '']}
          labelFormatter={(label) => {
            const code = String(label);
            return `${countryCodeToFlag(code)} ${code}`;
          }}
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
