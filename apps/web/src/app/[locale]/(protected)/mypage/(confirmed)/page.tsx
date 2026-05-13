/**
 * My Page (`/mypage`)
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
import { getLevelProgress } from '@blindfold-chess/features/exp';

import { getAuthenticatedUser } from '@/lib/auth';

import {
  DashboardCard,
  DashboardSection,
  DashboardSectionHeader,
  Divider,
  PageLayout,
  UserAvatar,
} from '@/app/[locale]/_components';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

import { ExpActivityHeatmap } from './_components/ExpActivityHeatmap';
import { getExpHeatmapData } from './_lib/getExpHeatmapData';
import { getMypageDashboardData } from './_lib/getMypageDashboardData';

type Props = LocalePageProps;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.mypage' });

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'mypage', title, description }),
    title: resolveTitle(title, locale),
    description,
    robots: { index: false, follow: false },
  };
}

export default async function MypagePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Mypage' });

  const user = await getAuthenticatedUser();
  const [data, expHeatmapData] = await Promise.all([
    getMypageDashboardData(user.id),
    getExpHeatmapData(user.id),
  ]);

  const levelProgress = getLevelProgress(data.totalExp);
  const expInCurrentLevel = data.totalExp - levelProgress.currentLevelExp;
  const expNeededForNext = levelProgress.nextLevelExp - levelProgress.currentLevelExp;
  const expRemaining = expNeededForNext - expInCurrentLevel;
  const progressPercent = Math.round(levelProgress.progress * 100);

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
      {/* User profile card */}
      <div className="flex items-center gap-4">
        <UserAvatar
          profileHref={null}
          avatarUrl={data.avatarUrl}
          displayName={data.displayName ?? data.username ?? ''}
          locale={locale}
          size="lg"
          showName={false}
        />
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground truncate">
            {data.displayName ?? data.username ?? t('title')}
          </h2>
          {data.username && <p className="text-sm text-muted-foreground">@{data.username}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {data.username && (
              <Link
                href={`/u/${data.username}`}
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

      {/* Level progress */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-semibold text-foreground">
            {t('dashboard.levelLabel', { level: levelProgress.level })}
          </span>
          <span className="text-xs text-muted-foreground">
            {t('dashboard.expProgress', {
              current: expInCurrentLevel.toLocaleString(),
              next: expNeededForNext.toLocaleString(),
            })}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('dashboard.expRemaining', {
            remaining: expRemaining.toLocaleString(),
          })}
        </p>
        <p className="mt-2 text-center">
          <Link
            href="/leaderboard/exp/all-time"
            locale={locale}
            className={`text-xs ${TEXT_LINK_MUTED_CLASSES}`}
          >
            {t('dashboard.viewExpLeaderboard')}
          </Link>
        </p>
      </div>

      {/* Point balance chip — links to the detailed history + redemption page */}
      <Link
        href="/mypage/points"
        locale={locale}
        className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 transition-all hover:border-primary/30"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🪙</span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">
              {t('dashboard.pointsTotal', { total: data.pointBalance.total })}
            </span>
            {data.pointBalance.pending > 0 && (
              <span className="text-xs text-muted-foreground">
                {t('dashboard.pointsBreakdown', {
                  confirmed: data.pointBalance.confirmed,
                  pending: data.pointBalance.pending,
                })}
              </span>
            )}
          </div>
        </div>
        <span className="text-sm text-muted-foreground">›</span>
      </Link>

      <Divider />

      {/* Interview banner — hidden when all questions are answered */}
      {data.unansweredInterviewCount > 0 && (
        <Link
          href="/interview"
          locale={locale}
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30"
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

      {/* Exp activity heatmap */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          <span className="mr-1">🔥</span>
          {t('dashboard.activityTitle')}
        </h3>
        <ExpActivityHeatmap
          data={expHeatmapData}
          legendLess={t('dashboard.heatmapLess')}
          legendMore={t('dashboard.heatmapMore')}
        />
      </section>

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

        {/* Practice section */}
        <DashboardSection>
          <DashboardSectionHeader
            icon={<span className="text-lg">💪</span>}
            title={t('dashboard.practiceTitle')}
          />
          <div className="flex flex-wrap gap-3 mt-3">
            <ChallengeCard
              locale={locale}
              href="/mypage/problems/memory"
              label={t('dashboard.myPositionMemory')}
              icon="🧠"
            />
            <ChallengeCard
              locale={locale}
              href="/mypage/problems/puzzles"
              label={t('dashboard.myPuzzles')}
              icon="🧩"
            />
          </div>
        </DashboardSection>

        {/* Account section */}
        <DashboardSection>
          <DashboardSectionHeader
            icon={<span className="text-lg">⚙️</span>}
            title={t('dashboard.accountTitle')}
          />
          <div className="flex flex-wrap gap-3 mt-3">
            <ChallengeCard
              locale={locale}
              href="/mypage/subscription"
              label={t('dashboard.subscriptionTitle')}
              icon="💳"
            />
            <ChallengeCard
              locale={locale}
              href="/mypage/benefits"
              label={t('dashboard.benefitsTitle')}
              icon="🎁"
            />
          </div>
        </DashboardSection>
      </DashboardCard>
    </PageLayout>
  );
}
