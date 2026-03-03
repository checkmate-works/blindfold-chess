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

type DataPoint = {
  date: string;
  score: number | null;
  previousScore: number | null;
};

type Props = {
  data: DataPoint[];
  emptyMessage: string;
  yAxisLabel: string;
  currentLabel: string;
  previousLabel: string;
};

export function ScoreChart({ data, emptyMessage, yAxisLabel, currentLabel, previousLabel }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }

  const hasPreviousData = data.some((d) => d.previousScore !== null);

  return (
    <ResponsiveContainer width="100%" height={250} minHeight={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="date"
          tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
          stroke="var(--color-border)"
        />
        <YAxis
          tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
          stroke="var(--color-border)"
          label={{
            value: yAxisLabel,
            angle: -90,
            position: 'insideLeft',
            fill: 'var(--color-muted-foreground)',
            fontSize: 12,
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-foreground)',
          }}
          formatter={(value: number | string | (string | number)[] | undefined, name?: string) => {
            if (value === undefined || value === null) return ['-', name ?? ''];
            const num = typeof value === 'number' ? value : Number(value);
            const label = name === 'previousScore' ? previousLabel : currentLabel;
            return [num.toFixed(1), label];
          }}
        />
        {hasPreviousData && <Legend />}
        <Line
          type="monotone"
          dataKey="score"
          name={currentLabel}
          stroke="var(--color-primary)"
          strokeWidth={2}
          dot={{ fill: 'var(--color-primary)', r: 3 }}
          activeDot={{ fill: 'var(--color-primary)', r: 5 }}
          connectNulls
        />
        {hasPreviousData && (
          <Line
            type="monotone"
            dataKey="previousScore"
            name={previousLabel}
            stroke="var(--color-muted-foreground)"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
            connectNulls
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
