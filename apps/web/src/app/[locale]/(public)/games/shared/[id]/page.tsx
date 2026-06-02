/**
 * Shared Game detail (公開対局の詳細)
 *
 * @description
 * Public permalink for a published blindfold game: an inline, steppable replay
 * plus the game's metadata, the entry point for receiving advice. Loaded by
 * UUIDv7 id; only public / unlisted, non-deleted games are visible.
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getCommentUserProfile, listGameComments } from '@/lib/db/game-comments';
import { getGameById } from '@/lib/db/games';
import { createClient } from '@/lib/supabase/server';
import { resolveDisplayName } from '@/lib/users/display-name';
import { UUID_RE } from '@/lib/validations/uuid';

import { PositionAuthorAttribution } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionAuthorAttribution';
import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GameReplay } from './_components/GameReplay';
import { OwnerActions } from './_components/OwnerActions';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const detail = UUID_RE.test(id) ? await getGameById(id) : null;
  const title =
    detail?.game.title ??
    (await getTranslations({ locale, namespace: 'sharedGames' }))('detail.fallbackTitle');

  return {
    ...generateCanonicalMetadata({ locale, path: `games/shared/${id}`, title }),
    title: resolveTitle(title, locale),
  };
}

export default async function SharedGamePage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  if (!UUID_RE.test(id)) notFound();

  const detail = await getGameById(id);
  if (!detail) notFound();

  const t = await getTranslations({ locale, namespace: 'sharedGames' });
  const { game, author } = detail;
  const authorDisplayName = author ? resolveDisplayName(author) : t('detail.guest');

  // Registered ownership is known server-side; account-less ownership (manage
  // token) is resolved client-side inside OwnerActions.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isRegisteredOwner = game.authorId != null && user?.id === game.authorId;

  // Advice comments (per-move) plus the viewer's profile, which enables posting
  // and rendering their own comment optimistically.
  const [comments, currentUser] = await Promise.all([
    listGameComments(game.id, user?.id),
    user ? getCommentUserProfile(user.id) : Promise.resolve(null),
  ]);

  return (
    <PageLayout
      title={game.title}
      locale={locale}
      breadcrumb={[{ label: t('list.title'), href: '/games/shared' }, { label: game.title }]}
    >
      <div className="space-y-6">
        {/* Board + move list (games/play layout); the description sits below
            the board, above the stats, via GameReplay's slot. */}
        <GameReplay
          gameId={game.id}
          moves={game.moves}
          startingFen={game.startingFen}
          playerColor={game.playerColor}
          engineConfig={game.engineConfig}
          operationLogs={game.operationLogs}
          locale={locale}
          comments={comments}
          currentUser={currentUser}
        >
          {game.description && (
            <div className="space-y-2">
              <SectionTitle>{t('detail.descriptionSection')}</SectionTitle>
              <p className="whitespace-pre-wrap text-foreground">{game.description}</p>
            </div>
          )}
        </GameReplay>

        {/* Owner-only edit / delete controls (registered via session, or
            account-less via the manage token held by OwnerActions). */}
        <OwnerActions gameId={game.id} isRegisteredOwner={isRegisteredOwner} locale={locale} />

        {/* Author attribution at the bottom — avatar + name + profile link,
            matching the chunk / position UGC pages. Anonymous authors get a
            fallback name and no profile link. */}
        <PositionAuthorAttribution
          profile={author ? { username: author.username, avatarUrl: author.avatarUrl } : null}
          displayName={authorDisplayName}
          createdByLabel={t('detail.sharedBy')}
          locale={locale}
        />
      </div>
    </PageLayout>
  );
}
