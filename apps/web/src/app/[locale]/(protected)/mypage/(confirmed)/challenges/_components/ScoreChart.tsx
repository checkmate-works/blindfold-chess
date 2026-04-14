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
import type { Props as LegendProps } from 'recharts/types/component/DefaultLegendContent';

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
  onPreviousLabelClick?: () => void;
};

export function ScoreChart({
  data,
  emptyMessage,
  yAxisLabel,
  currentLabel,
  previousLabel,
  onPreviousLabelClick,
}: Props) {
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
          formatter={(
            value: number | string | readonly (string | number)[] | undefined,
            name?: string | number
          ) => {
            if (value === undefined || value === null) return ['-', String(name ?? '')];
            const num = typeof value === 'number' ? value : Number(value);
            const label = name === 'previousScore' ? previousLabel : currentLabel;
            return [num.toFixed(1), label];
          }}
        />
        {hasPreviousData && (
          <Legend
            content={({ payload }: LegendProps) => {
              if (!payload || payload.length === 0) return null;
              return (
                <div className="flex justify-center gap-6 text-xs mt-1">
                  {payload.map((entry) => {
                    const isClickable = entry.dataKey === 'previousScore' && !!onPreviousLabelClick;
                    return (
                      <span
                        key={String(entry.dataKey)}
                        role={isClickable ? 'button' : undefined}
                        tabIndex={isClickable ? 0 : undefined}
                        className={
                          isClickable ? 'cursor-pointer hover:underline select-none' : 'select-none'
                        }
                        onClick={isClickable ? onPreviousLabelClick : undefined}
                        onKeyDown={
                          isClickable
                            ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  onPreviousLabelClick?.();
                                }
                              }
                            : undefined
                        }
                      >
                        <span
                          className="inline-block w-3 h-[2px] align-middle mr-1"
                          style={{ backgroundColor: entry.color }}
                        />
                        {entry.value}
                      </span>
                    );
                  })}
                </div>
              );
            }}
          />
        )}
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
            dot={{ fill: 'var(--color-muted-foreground)', r: 2 }}
            activeDot={{ fill: 'var(--color-muted-foreground)', r: 4 }}
            connectNulls
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
