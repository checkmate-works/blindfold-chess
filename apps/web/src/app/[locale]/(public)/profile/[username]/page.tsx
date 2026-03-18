import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { Link } from '@/i18n/routing';
import { and, count, eq, isNull } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';
import { SiChessdotcom, SiLichess } from 'react-icons/si';

import { countryCodeToFlag } from '@/lib/countries';
import { db, profiles, userFollows } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

import { TopicPostCard } from '@/app/[locale]/(public)/(home)/_components/TopicPostCard';
import { getPostsByUserId } from '@/app/[locale]/(public)/topics/squares/_lib/queries';
import { PagePanel, PaginationNav, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { FollowButton } from './_components/FollowButton';

const PAGE_SIZE = 5;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

type Props = {
  params: Promise<{ locale: Locale; username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, username } = await params;

  const [profile] = await db
    .select({
      displayName: profiles.displayName,
      bio: profiles.bio,
    })
    .from(profiles)
    .where(and(eq(profiles.username, username), isNull(profiles.deletedAt)))
    .limit(1);

  if (!profile) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'publicProfile' });

  return {
    title: t('title', { displayName: profile.displayName ?? username }),
    description:
      profile.bio || t('defaultDescription', { displayName: profile.displayName ?? username }),
    alternates: {
      canonical: `/${locale}/@/${username}`,
    },
  };
}

export default async function PublicProfilePage({ params, searchParams }: Props) {
  const { locale, username } = await params;

  const [profile] = await db
    .select({
      id: profiles.id,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      bio: profiles.bio,
      country: profiles.country,
      flair: profiles.flair,
      fideId: profiles.fideId,
      chesscomUsername: profiles.chesscomUsername,
      lichessUsername: profiles.lichessUsername,
    })
    .from(profiles)
    .where(and(eq(profiles.username, username), isNull(profiles.deletedAt)))
    .limit(1);

  if (!profile) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwnProfile = user?.id === profile.id;

  let initialFollowing = false;
  let followedByProfile = false;
  if (user && !isOwnProfile) {
    const [existingFollow] = await db
      .select({ id: userFollows.id })
      .from(userFollows)
      .where(and(eq(userFollows.followerId, user.id), eq(userFollows.followingId, profile.id)))
      .limit(1);
    initialFollowing = !!existingFollow;

    const [reverseFollow] = await db
      .select({ id: userFollows.id })
      .from(userFollows)
      .where(and(eq(userFollows.followerId, profile.id), eq(userFollows.followingId, user.id)))
      .limit(1);
    followedByProfile = !!reverseFollow;
  }

  const [followerResult] = await db
    .select({ count: count() })
    .from(userFollows)
    .innerJoin(profiles, eq(userFollows.followerId, profiles.id))
    .where(and(eq(userFollows.followingId, profile.id), isNull(profiles.deletedAt)));
  const followerCount = followerResult.count;

  let followingCount = 0;
  if (isOwnProfile) {
    const [followingResult] = await db
      .select({ count: count() })
      .from(userFollows)
      .innerJoin(profiles, eq(userFollows.followingId, profiles.id))
      .where(and(eq(userFollows.followerId, profile.id), isNull(profiles.deletedAt)));
    followingCount = followingResult.count;
  }

  const t = await getTranslations({ locale, namespace: 'publicProfile' });

  const hasChessAccounts = profile.fideId || profile.chesscomUsername || profile.lichessUsername;

  const allPosts = await getPostsByUserId(profile.id, user?.id);

  const { page } = await searchParamsCache.parse(searchParams);
  const totalCount = allPosts.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));
  const posts = allPosts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const buildHref = (p: number) => {
    const qs = p > 1 ? `?page=${p}` : '';
    return `/${locale}/@/${username}${qs}`;
  };

  return (
    <PagePanel>
      <div className="space-y-6">
        {/* Avatar */}
        {profile.avatarUrl ? (
          <Image
            src={profile.avatarUrl}
            alt={profile.displayName ?? profile.username}
            width={96}
            height={96}
            className="rounded-full object-cover h-24 w-24"
            unoptimized
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-12 w-12"
            >
              <path
                fillRule="evenodd"
                d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}

        {/* Display Name + Action Button Row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {profile.displayName}
              {profile.flair && <span className="ml-2">{profile.flair}</span>}
              {profile.country && (
                <span className="ml-2">{countryCodeToFlag(profile.country)}</span>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">@{profile.username}</p>
          </div>
          <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
            {isOwnProfile ? (
              <Link
                href="/mypage/profile"
                locale={locale}
                className="rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                {t('editProfile')}
              </Link>
            ) : (
              <>
                {followedByProfile && (
                  <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground mr-3 sm:mr-0">
                    {t('followsYou')}
                  </span>
                )}
                <FollowButton
                  targetUsername={profile.username}
                  locale={locale}
                  initialFollowing={initialFollowing}
                  isAuthenticated={!!user}
                />
              </>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <p className="text-sm text-muted-foreground">
          {isOwnProfile && (
            <>
              <Link href="/mypage/following" locale={locale} className="hover:underline">
                <span className="font-semibold text-foreground">{followingCount}</span>{' '}
                {t('followingCount')}
              </Link>
              <span className="mx-2" />
            </>
          )}
          <Link href={`/@/${username}/followers`} locale={locale} className="hover:underline">
            <span className="font-semibold text-foreground">{followerCount}</span> {t('followers')}
          </Link>
        </p>

        {/* Chess Account Links */}
        {hasChessAccounts && (
          <div className="flex items-center gap-4">
            {profile.fideId && (
              <a
                href={`https://ratings.fide.com/profile/${profile.fideId}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="FIDE profile"
                title="FIDE"
                className="opacity-70 transition-opacity hover:opacity-100"
              >
                <Image
                  src="/images/fide-favicon.ico"
                  alt="FIDE"
                  width={24}
                  height={24}
                  unoptimized
                />
              </a>
            )}
            {profile.chesscomUsername && (
              <a
                href={`https://www.chess.com/member/${profile.chesscomUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chess.com profile"
                title="Chess.com"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <SiChessdotcom size={24} />
              </a>
            )}
            {profile.lichessUsername && (
              <a
                href={`https://lichess.org/@/${profile.lichessUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Lichess profile"
                title="Lichess"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <SiLichess size={24} />
              </a>
            )}
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <div className="space-y-3">
            <SectionTitle>{t('bio')}</SectionTitle>
            <p className="text-foreground whitespace-pre-wrap">{profile.bio}</p>
          </div>
        )}

        {/* Topics Tab */}
        <div>
          <div className="border-b border-border">
            <nav className="flex">
              <button className="px-4 py-2 text-sm font-bold text-foreground border-b-2 border-foreground">
                {t('topicsTab')}{' '}
                <span className="text-muted-foreground font-normal">{totalCount}</span>
              </button>
            </nav>
          </div>

          <div className="mt-4 space-y-3">
            {posts.length > 0 ? (
              posts.map((post) => <TopicPostCard key={post.id} post={post} locale={locale} />)
            ) : (
              <p className="py-8 text-center text-muted-foreground">{t('noTopicPosts')}</p>
            )}
          </div>

          <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
        </div>
      </div>
    </PagePanel>
  );
}
