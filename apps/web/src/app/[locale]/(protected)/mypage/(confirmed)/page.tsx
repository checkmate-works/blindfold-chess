/**
 * My Page (マイページ — `/mypage`)
 *
 * @description
 * The authenticated user's personal hub. Shows profile card, interview banner,
 * and dashboard sections (Challenge: belt system & records, Social: posts & likes).
 * Distinct from the root dashboard (`/`) which provides quick-access shortcuts.
 *
 * @flow
 * - Profile card with avatar, display name, edit/view links
 * - Interview banner (hidden when all questions answered)
 * - Challenge section: Belt System, My Records
 * - Social section: Posts, Likes
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ChallengeCard } from '@/app/_components';
import { Link } from '@/i18n/routing';

import { getAuthenticatedUser } from '@/lib/auth';

import {
  DashboardCard,
  DashboardSection,
  DashboardSectionHeader,
  Divider,
  PagePanel,
  PageTitle,
  UserAvatar,
} from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';

import { getMypageDashboardData } from './_lib/getMypageDashboardData';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.mypage' });

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'mypage', title, description }),
    title,
    description,
    robots: { index: false, follow: false },
  };
}

export default async function MypagePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Mypage' });

  const user = await getAuthenticatedUser();
  const data = await getMypageDashboardData(user.id);

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>
      <PagePanel>
        {/* User profile card */}
        <div className="flex items-center gap-4">
          <UserAvatar
            src={data.avatarUrl}
            alt={data.displayName ?? data.username ?? ''}
            size={64}
          />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate">
              {data.displayName ?? data.username ?? t('title')}
            </h2>
            {data.username && <p className="text-sm text-muted-foreground">@{data.username}</p>}
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {data.username && (
                <Link
                  href={`/@/${data.username}`}
                  locale={locale}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <span>👤</span>
                  <span>{t('dashboard.viewProfile')}</span>
                </Link>
              )}
              <Link
                href="/mypage/profile"
                locale={locale}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <span>✏️</span>
                <span>{t('dashboard.editProfile')}</span>
              </Link>
            </div>
          </div>
        </div>

        <Divider />

        {/* Interview banner — hidden when all questions are answered */}
        {data.unansweredInterviewCount > 0 && (
          <Link
            href="/interview"
            locale={locale}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🎙️</span>
              <span className="text-sm font-semibold text-foreground">
                {t('dashboard.interviewBanner')}
              </span>
            </div>
            <span className="bg-primary text-primary-foreground rounded-full text-xs px-1.5 py-0.5 min-w-[1.25rem] text-center">
              {data.unansweredInterviewCount}
            </span>
          </Link>
        )}

        {/* Dashboard sections — same structure as home page VsAiCard */}
        <DashboardCard>
          {/* Challenge section */}
          <DashboardSection>
            <DashboardSectionHeader
              icon={<span className="text-lg">🏆</span>}
              title={t('dashboard.challengeTitle')}
            />
            <div className="flex flex-wrap gap-3 mt-3">
              <ChallengeCard
                locale={locale}
                href="/ranks"
                label={t('dashboard.beltSystem')}
                icon="🥋"
              />
              <ChallengeCard
                locale={locale}
                href="/mypage/challenges"
                label={t('dashboard.myRecords')}
                icon="📈"
              />
            </div>
          </DashboardSection>

          {/* Social section */}
          <DashboardSection>
            <DashboardSectionHeader
              icon={<span className="text-lg">💬</span>}
              title={t('dashboard.socialTitle')}
            />
            <div className="flex flex-wrap gap-3 mt-3">
              <ChallengeCard
                locale={locale}
                href="/mypage/posts"
                label={t('dashboard.postsTitle')}
                icon="📝"
              />
              <ChallengeCard
                locale={locale}
                href="/mypage/likes"
                label={t('dashboard.likesTitle')}
                icon="❤️"
              />
            </div>
          </DashboardSection>
        </DashboardCard>

        <Divider />

        <Breadcrumb locale={locale} items={[{ label: t('title') }]} />
      </PagePanel>
    </div>
  );
}
