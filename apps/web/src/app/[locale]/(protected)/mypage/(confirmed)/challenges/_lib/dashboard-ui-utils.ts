import type { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { DatePeriod } from './period-utils';

export function getComparisonLabel(
  period: DatePeriod,
  t: ReturnType<typeof useTranslations>
): string {
  switch (period) {
    case 'thisWeek':
      return t('vsLastWeek');
    case 'lastWeek':
      return t('vs2WeeksAgo');
    case 'thisMonth':
      return t('vsLastMonth');
    case 'lastMonth':
      return t('vs2MonthsAgo');
  }
}

export function getPreviousPeriodLabel(period: DatePeriod): string {
  switch (period) {
    case 'thisWeek':
      return 'lastWeek';
    case 'lastWeek':
      return 'twoWeeksAgo';
    case 'thisMonth':
      return 'lastMonth';
    case 'lastMonth':
      return 'twoMonthsAgo';
  }
}

/**
 * Returns the DatePeriod that the previous-period legend label should navigate to,
 * or null if the previous period is not a selectable option.
 *
 * thisWeek  → lastWeek  (selectable)
 * thisMonth → lastMonth (selectable)
 * lastWeek  → null      ("2 weeks ago" is not selectable)
 * lastMonth → null      ("2 months ago" is not selectable)
 */
export function getNavigablePreviousPeriod(period: DatePeriod): DatePeriod | null {
  switch (period) {
    case 'thisWeek':
      return 'lastWeek';
    case 'thisMonth':
      return 'lastMonth';
    default:
      return null;
  }
}
