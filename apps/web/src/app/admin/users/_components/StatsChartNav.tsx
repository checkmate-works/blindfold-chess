'use client';

import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { EMPTY_ADMIN_USER_FILTERS, buildAdminUsersHref } from '../_lib/filters';

type ChartFilterKey = 'country' | 'rank' | 'level' | 'provider';

type Props = {
  type: ChartFilterKey;
  children: ReactNode;
};

const FILTER_FIELD: Record<
  ChartFilterKey,
  'countryFilter' | 'rankFilter' | 'levelFilter' | 'providerFilter'
> = {
  country: 'countryFilter',
  rank: 'rankFilter',
  level: 'levelFilter',
  provider: 'providerFilter',
};

type BarClickHandler = (value: string) => void;

const BarClickContext = createContext<BarClickHandler | null>(null);

/**
 * Provides the chart inside it with a bar-click handler that opens the users
 * list filtered to the clicked bucket. The stats page's own status / provider
 * filters are carried along, so the list shows exactly the users the bar
 * counted and not the unfiltered population.
 *
 * The handler travels by context rather than `cloneElement`: this wrapper is
 * rendered by a Server Component, and a Client Component element passed as
 * `children` across that boundary arrives as a lazy reference, not a plain
 * element, so `Children.only` / `cloneElement` reject it at request time
 * ("expected to receive a single React element child", a 500 on the page).
 * Context has no such requirement — the chart reads the handler with
 * {@link useStatsBarClick} when it mounts.
 */
export function StatsChartNav({ type, children }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleBarClick: BarClickHandler = (value) => {
    const filters = {
      ...EMPTY_ADMIN_USER_FILTERS,
      statusFilter: searchParams.get('status') ?? '',
      providerFilter: searchParams.get('provider') ?? '',
    };
    filters[FILTER_FIELD[type]] = value;
    router.push(buildAdminUsersHref(filters, 1));
  };

  return <BarClickContext.Provider value={handleBarClick}>{children}</BarClickContext.Provider>;
}

/**
 * The bar-click handler from the nearest {@link StatsChartNav}, or `undefined`
 * when the chart is rendered outside one (bars are then non-interactive).
 */
export function useStatsBarClick(): BarClickHandler | undefined {
  return useContext(BarClickContext) ?? undefined;
}
