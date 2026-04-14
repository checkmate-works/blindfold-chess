'use client';

import type { ReactElement } from 'react';
import { Children, cloneElement, isValidElement } from 'react';

import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';

type Props = {
  type: 'country' | 'rank' | 'provider';
  children: ReactElement;
};

/**
 * Wrapper that injects an `onBarClick` handler into a chart component.
 * Clicking a bar sets the corresponding filter and navigates to the List tab.
 */
export function StatsChartNav({ type, children }: Props) {
  const [, setParams] = useQueryStates({
    country: parseAsString.withDefault(''),
    rank: parseAsString.withDefault(''),
    provider: parseAsString.withDefault(''),
    tab: parseAsString.withDefault('list'),
    page: parseAsInteger.withDefault(1),
  });

  const handleBarClick = (value: string) => {
    if (type === 'country') {
      setParams(
        { country: value || null, tab: 'list', page: null },
        { history: 'push', shallow: false }
      );
    } else if (type === 'rank') {
      setParams(
        { rank: value || null, tab: 'list', page: null },
        { history: 'push', shallow: false }
      );
    } else {
      setParams(
        { provider: value || null, tab: 'list', page: null },
        { history: 'push', shallow: false }
      );
    }
  };

  const child = Children.only(children);
  if (!isValidElement(child)) return children;

  return cloneElement(child, { onBarClick: handleBarClick } as Record<string, unknown>);
}
