import type { MypageDashboardData } from './getMypageDashboardData';

export type DashboardNavItem = {
  icon: string;
  href: '/interview';
  label: string;
  badge?: number;
};

export function buildDashboardNavItems(
  data: MypageDashboardData,
  t: (key: string, values?: Record<string, string | number | Date>) => string
): DashboardNavItem[] {
  return [
    {
      icon: '\u2753',
      href: '/interview',
      label: t('dashboard.interviewTitle'),
      badge: data.unansweredInterviewCount > 0 ? data.unansweredInterviewCount : undefined,
    },
  ];
}
