import type { ClientTranslator } from '@/i18n/translator';
import { getComparisonLabelKey } from '@blindfold-chess/features/challenge-records';

import type { DatePeriod } from './period-utils';

export {
  getNavigablePreviousPeriod,
  getPreviousPeriodLabel,
} from '@blindfold-chess/features/challenge-records';

export function getComparisonLabel(period: DatePeriod, t: ClientTranslator): string {
  // Mypage.<ComparisonLabelKey>: Mypage.vsLastWeek, Mypage.vs2WeeksAgo, Mypage.vsLastMonth, Mypage.vs2MonthsAgo (getComparisonLabelKey)
  return t(getComparisonLabelKey(period));
}
