import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { and, eq, isNull } from 'drizzle-orm';
import { SiChessdotcom, SiLichess } from 'react-icons/si';

import { countryCodeToFlag } from '@/lib/countries';
import { db, profiles } from '@/lib/db';

import { PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  params: Promise<{ locale: Locale; username: string }>;
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

export default async function PublicProfilePage({ params }: Props) {
  const { locale, username } = await params;

  const [profile] = await db
    .select({
      username: profiles.username,
      displayName: profiles.displayName,
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

  const t = await getTranslations({ locale, namespace: 'publicProfile' });

  const hasChessAccounts = profile.fideId || profile.chesscomUsername || profile.lichessUsername;

  return (
    <div className="space-y-8">
      <PageTitle>
        {profile.displayName}
        {profile.flair && <span className="ml-2">{profile.flair}</span>}
        {profile.country && <span className="ml-2">{countryCodeToFlag(profile.country)}</span>}
      </PageTitle>

      <PagePanel>
        <div className="space-y-6">
          {profile.bio && (
            <div className="space-y-3">
              <SectionTitle>{t('bio')}</SectionTitle>
              <p className="text-foreground whitespace-pre-wrap">{profile.bio}</p>
            </div>
          )}

          {hasChessAccounts && (
            <div className="space-y-3">
              <SectionTitle>{t('chessAccounts')}</SectionTitle>
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
                      width={20}
                      height={20}
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
                    <SiChessdotcom size={20} />
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
                    <SiLichess size={20} />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </PagePanel>
    </div>
  );
}
