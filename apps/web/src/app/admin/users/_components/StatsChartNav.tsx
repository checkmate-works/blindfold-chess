'use client';

import type { ReactElement } from 'react';
import { Children, cloneElement, isValidElement } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { EMPTY_ADMIN_USER_FILTERS, buildAdminUsersHref } from '../_lib/filters';

type ChartFilterKey = 'country' | 'rank' | 'level' | 'provider';

type Props = {
  type: ChartFilterKey;
  children: ReactElement;
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

/**
 * Wrapper that injects an `onBarClick` handler into a chart component.
 * Clicking a bar opens the users list filtered to that bar's bucket. The
 * stats page's own status / provider filters are carried along, so the list
 * shows exactly the users the bar counted and not the unfiltered population.
 */
export function StatsChartNav({ type, children }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleBarClick = (value: string) => {
    const filters = {
      ...EMPTY_ADMIN_USER_FILTERS,
      statusFilter: searchParams.get('status') ?? '',
      providerFilter: searchParams.get('provider') ?? '',
    };
    filters[FILTER_FIELD[type]] = value;
    router.push(buildAdminUsersHref(filters, 1));
  };

  const child = Children.only(children);
  if (!isValidElement(child)) return children;

  return cloneElement(child, { onBarClick: handleBarClick } as Record<string, unknown>);
}
