'use client';

import { HorizontalCountBarChart } from '@/app/admin/_components/HorizontalCountBarChart';
import { Tooltip, YAxis } from 'recharts';

import { countryCodeToFlag } from '@/lib/countries';

import type { CountryStat } from '../_lib/queries';
// Deep import (not the barrel): the queries barrel re-exports server-only
// modules (admin Supabase client), which would be pulled into this client
// component's bundle. `country-stats` itself is pure (type-only imports).
import { UNKNOWN_COUNTRY } from '../_lib/queries/country-stats';

// Admin UI is rendered in English only (see `getTranslations({ locale: 'en' })`
// in the admin layout / page), so a fixed-locale resolver is sufficient here.
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

function countryName(code: string): string {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

type ChartLabels = {
  noData: string;
  users: string;
  /** Label for the bucket of users with no country set. */
  unknown: string;
};

type Props = {
  data: CountryStat[];
  labels: ChartLabels;
  onBarClick?: (country: string) => void;
};

// Flag + full country name for the hover card. The unknown bucket has no real
// ISO code, so render a globe + the localized label instead of feeding the
// sentinel string to `countryCodeToFlag` / `Intl.DisplayNames`.
function hoverHeading(code: string, labels: ChartLabels): string {
  return code === UNKNOWN_COUNTRY
    ? `🌐 ${labels.unknown}`
    : `${countryCodeToFlag(code)} ${countryName(code)}`;
}

// Custom tooltip. We read the country off the data row (`payload[0].payload`)
// rather than the Recharts `label`, whose value is unreliable for a vertical
// (category-on-Y) bar chart — that indirection is why the name failed to show.
function CountryTooltip({
  active,
  payload,
  labels,
}: {
  active?: boolean;
  payload?: Array<{ payload?: CountryStat }>;
  labels: ChartLabels;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  if (!entry) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-foreground">
      <div className="font-semibold">{hoverHeading(entry.country, labels)}</div>
      <div className="text-sm text-muted-foreground">
        {entry.count} {labels.users}
      </div>
    </div>
  );
}

export function CountryBarChart({ data, labels, onBarClick }: Props) {
  // Compact axis label: flag + ISO code (e.g. "🇯🇵 JP"). The unknown bucket has
  // no real code, so render a globe + the localized label instead of feeding
  // the sentinel string to `countryCodeToFlag`. The full country name lives in
  // the hover tooltip, where the extra width is fine.
  const tickLabel = (code: string) =>
    code === UNKNOWN_COUNTRY ? `🌐 ${labels.unknown}` : `${countryCodeToFlag(code)} ${code}`;

  return (
    <HorizontalCountBarChart
      data={data}
      isEmpty={data.length === 0}
      noDataLabel={labels.noData}
      yAxis={<YAxis type="category" dataKey="country" width={96} tickFormatter={tickLabel} />}
      tooltip={
        <Tooltip
          cursor={{ fill: 'var(--color-accent)' }}
          content={<CountryTooltip labels={labels} />}
        />
      }
      onBarClick={
        onBarClick && ((entry: CountryStat) => entry.country && onBarClick(entry.country))
      }
    />
  );
}
