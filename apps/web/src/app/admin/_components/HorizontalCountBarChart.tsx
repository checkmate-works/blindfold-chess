'use client';

import type { ReactNode } from 'react';

import { Bar, BarChart, ResponsiveContainer, XAxis } from 'recharts';

/** Row height the chart grows by, and the floor it never shrinks below. */
const BAR_HEIGHT = 40;
const MIN_HEIGHT = 200;

type Props<T> = {
  data: T[];
  /**
   * Whether to show `noDataLabel` instead of the chart. A computed value, not
   * a mode: "no rows" for the rank and country charts, "every count is zero"
   * for signup methods, which always has all its buckets.
   */
  isEmpty: boolean;
  noDataLabel: string;
  /**
   * The `<YAxis>` element. A slot because the category axis is where these
   * charts genuinely differ — a plain `tickFormatter`, a flag-and-code
   * formatter, and a custom tick component that paints each label in its belt
   * colour.
   */
  yAxis: ReactNode;
  /** The `<Tooltip>` element — likewise different per chart. */
  tooltip: ReactNode;
  /** Called with the clicked row. Omit to render non-interactive bars. */
  onBarClick?: (row: T) => void;
};

/**
 * A horizontal bar chart of counts: category down the Y axis, count along X.
 *
 * The three admin charts built on it — rank distribution, signup method,
 * country — had each written out the same height formula, the same empty
 * state, the same margins, the same `<XAxis type="number" allowDecimals>`, and
 * the same `<Bar>` down to the corner radius and the `as unknown as T` cast
 * Recharts' untyped click payload forces. Only the category axis and the
 * tooltip actually differed, so those are slots and the rest is here.
 */
export function HorizontalCountBarChart<T>({
  data,
  isEmpty,
  noDataLabel,
  yAxis,
  tooltip,
  onBarClick,
}: Props<T>) {
  if (isEmpty) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        {noDataLabel}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * BAR_HEIGHT, MIN_HEIGHT)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
        <XAxis type="number" allowDecimals={false} />
        {yAxis}
        {tooltip}
        <Bar
          dataKey="count"
          fill="var(--color-primary)"
          radius={[0, 4, 4, 0]}
          cursor={onBarClick ? 'pointer' : undefined}
          onClick={(row) => onBarClick?.(row as unknown as T)}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
