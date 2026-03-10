import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';
import { and, count, eq, gte, isNull, lt } from 'drizzle-orm';

import { db, follows, practiceSessions, profiles, topicPostLikes, topicPosts } from '@/lib/db';
import { getSessionScoreFields, parsePracticeSession } from '@/lib/db/practice-session-types';
import { createClient } from '@/lib/supabase/server';

import { Breadcrumb, Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';

import { getMondayOfWeek } from './practice/_lib/period-utils';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.mypage' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'mypage' }),
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

export default async function MypagePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Mypage' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user!.id;

  // Fetch all data in parallel
  const [profileResult, likesResult, followingResult, weekSessions] = await Promise.all([
    db
      .select({ username: profiles.username })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1),
    db
      .select({ value: count() })
      .from(topicPostLikes)
      .innerJoin(topicPosts, eq(topicPostLikes.postId, topicPosts.id))
      .where(and(eq(topicPostLikes.userId, userId), isNull(topicPosts.deletedAt))),
    db
      .select({ value: count() })
      .from(follows)
      .innerJoin(profiles, eq(follows.followingId, profiles.id))
      .where(and(eq(follows.followerId, userId), isNull(profiles.deletedAt))),
    (() => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monday = getMondayOfWeek(today);
      const endOfToday = new Date(today);
      endOfToday.setDate(endOfToday.getDate() + 1);

      return db
        .select()
        .from(practiceSessions)
        .where(
          and(
            eq(practiceSessions.userId, userId),
            gte(practiceSessions.startedAt, monday),
            lt(practiceSessions.startedAt, endOfToday)
          )
        );
    })(),
  ]);

  const username = profileResult[0]?.username;
  const likesCount = likesResult[0]?.value ?? 0;
  const followingCount = followingResult[0]?.value ?? 0;

  // Compute practice summary for this week
  const parsedSessions = weekSessions.map(parsePracticeSession);
  const weekSessionCount = parsedSessions.length;
  const weekBestScore = parsedSessions.reduce((best, session) => {
    const fields = getSessionScoreFields(session);
    if (!fields) return best;
    return Math.max(best, fields.correctAnswers);
  }, 0);

  const cards = [
    {
      icon: '\u{1F4CA}',
      href: '/mypage/practice' as const,
      title: t('dashboard.practiceTitle'),
      summary:
        weekSessionCount > 0
          ? t('dashboard.practiceSummary', { sessions: weekSessionCount, bestScore: weekBestScore })
          : t('dashboard.practiceEmpty'),
    },
    {
      icon: '\u2764\uFE0F',
      href: '/mypage/likes' as const,
      title: t('dashboard.likesTitle'),
      summary: t('dashboard.likesSummary', { count: likesCount }),
    },
    {
      icon: '\u{1F465}',
      href: '/mypage/following' as const,
      title: t('dashboard.followingTitle'),
      summary: t('dashboard.followingSummary', { count: followingCount }),
    },
    {
      icon: '\u270F\uFE0F',
      href: '/mypage/profile' as const,
      title: t('dashboard.profileTitle'),
      summary: t('dashboard.profileSummary'),
    },
  ];

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>
      <PagePanel>
        {username && (
          <div className="mb-4">
            <Link
              href={`/@/${username}`}
              className="rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {t('dashboard.viewProfile', { username })}
            </Link>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="block rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted"
            >
              <span className="text-2xl">{card.icon}</span>
              <h2 className="mt-2 text-base font-semibold text-card-foreground">{card.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{card.summary}</p>
            </Link>
          ))}
        </div>

        <Divider />

        <Breadcrumb locale={locale} items={[{ label: t('title') }]} />
      </PagePanel>
    </div>
  );
}
