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
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor="date-from" className="text-sm text-muted-foreground">
          {labels.from}
        </label>
        <input
          id="date-from"
          type="date"
          value={startDate}
          max={endDate}
          onChange={(e) => setParams({ from: e.target.value })}
          className="border border-border rounded px-3 py-1.5 text-sm bg-card"
        />
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="date-to" className="text-sm text-muted-foreground">
          {labels.to}
        </label>
        <input
          id="date-to"
          type="date"
          value={endDate}
          min={startDate}
          max={today()}
          onChange={(e) => setParams({ to: e.target.value })}
          className="border border-border rounded px-3 py-1.5 text-sm bg-card"
        />
      </div>
      <div className="flex gap-1.5">
        {presets.map((preset) => {
          const presetFrom = daysAgo(preset.days);
          const presetTo = today();
          const isActive = startDate === presetFrom && endDate === presetTo;

          return (
            <button
              key={preset.days}
              type="button"
              onClick={() => setParams({ from: presetFrom, to: presetTo })}
              className={`px-3 py-1.5 text-xs rounded border transition-colors ${
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
    </div>
  );
}
