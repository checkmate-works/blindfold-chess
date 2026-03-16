'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { DailyCount } from '../_lib/queries';

type DataPoint = {
  date: string;
  newUsers: number;
  posts: number;
};

type Props = {
  newUsersData: DailyCount[];
  postsData: DailyCount[];
  labels: {
    newUsers: string;
    posts: string;
    noData: string;
  };
};

export function DailyTrendChart({ newUsersData, postsData, labels }: Props) {
  // Merge both datasets by date
  const dateMap = new Map<string, DataPoint>();

  for (const d of newUsersData) {
    dateMap.set(d.date, { date: d.date, newUsers: d.count, posts: 0 });
  }
  for (const d of postsData) {
    const existing = dateMap.get(d.date);
    if (existing) {
      existing.posts = d.count;
    } else {
      dateMap.set(d.date, { date: d.date, newUsers: 0, posts: d.count });
    }
  }

  const data = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Format date for display (MM/DD)
  const formatDate = (dateStr: string) => {
    const [, m, d] = dateStr.split('-');
    return `${m}/${d}`;
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        {labels.noData}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300} minHeight={250}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
          stroke="var(--color-border)"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
          stroke="var(--color-border)"
        />
        <Tooltip
          labelFormatter={(label) => String(label)}
          contentStyle={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-foreground)',
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="newUsers"
          name={labels.newUsers}
          stroke="var(--color-primary)"
          strokeWidth={2}
          dot={{ fill: 'var(--color-primary)', r: 3 }}
          activeDot={{ fill: 'var(--color-primary)', r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="posts"
          name={labels.posts}
          stroke="var(--color-accent-purple)"
          strokeWidth={2}
          dot={{ fill: 'var(--color-accent-purple)', r: 3 }}
          activeDot={{ fill: 'var(--color-accent-purple)', r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
