'use client';

import { parseAsString, useQueryStates } from 'nuqs';

import { daysAgo, today } from '../_lib/date-utils';

type Props = {
  startDate: string;
  endDate: string;
  labels: {
    from: string;
    to: string;
    past7days: string;
    past28days: string;
    past90days: string;
  };
};

export function DateRangePicker({ startDate, endDate, labels }: Props) {
  const [, setParams] = useQueryStates(
    {
      from: parseAsString.withDefault(daysAgo(28)),
      to: parseAsString.withDefault(today()),
    },
    { shallow: false }
  );

  const presets = [
    { label: labels.past7days, days: 7 },
    { label: labels.past28days, days: 28 },
    { label: labels.past90days, days: 90 },
  ] as const;

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor="date-from" className="text-xs font-medium text-muted-foreground">
          {labels.from}
        </label>
        <input
          id="date-from"
          type="date"
          value={startDate}
          max={endDate}
          onChange={(e) => setParams({ from: e.target.value })}
          className="h-9 min-w-0 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor="date-to" className="text-xs font-medium text-muted-foreground">
          {labels.to}
        </label>
        <input
          id="date-to"
          type="date"
          value={endDate}
          min={startDate}
          max={today()}
          onChange={(e) => setParams({ to: e.target.value })}
          className="h-9 min-w-0 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const presetFrom = daysAgo(preset.days);
          const presetTo = today();
          const isActive = startDate === presetFrom && endDate === presetTo;

          return (
            <button
              key={preset.days}
              type="button"
              aria-pressed={isActive}
              onClick={() => setParams({ from: presetFrom, to: presetTo })}
              className={`h-9 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border bg-secondary text-secondary-foreground hover:bg-background'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <span className="pb-2 text-xs text-muted-foreground">UTC</span>
    </div>
  );
}
