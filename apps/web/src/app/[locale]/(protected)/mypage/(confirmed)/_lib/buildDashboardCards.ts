import type { MypageDashboardData } from './getMypageDashboardData';

export type DashboardCard = {
  icon: string;
  href: '/mypage/challenges' | '/mypage/likes' | '/mypage/following' | '/mypage/profile';
  title: string;
  summary: string;
};

export function buildDashboardCards(
  data: MypageDashboardData,
  t: (key: string, values?: Record<string, string | number | Date>) => string
): DashboardCard[] {
  return [
    {
      icon: '\uD83C\uDFC6',
      href: '/mypage/challenges',
      title: t('dashboard.challengeTitle'),
      summary: t('dashboard.challengeStaticSummary'),
    },
    {
      icon: '\u2764\uFE0F',
      href: '/mypage/likes',
      title: t('dashboard.likesTitle'),
      summary: t('dashboard.likesSummary', { count: data.likesCount }),
    },
    {
      icon: '\u{1F465}',
      href: '/mypage/following',
      title: t('dashboard.followingTitle'),
      summary: t('dashboard.followingSummary', { count: data.followingCount }),
    },
    {
      icon: '\u270F\uFE0F',
      href: '/mypage/profile',
      title: t('dashboard.profileTitle'),
      summary: t('dashboard.profileSummary'),
    },
  ];
}
