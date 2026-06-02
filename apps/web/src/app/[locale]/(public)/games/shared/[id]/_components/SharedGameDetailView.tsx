import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getAllAvailableChunkOptions } from '@/lib/chunks/queries';
import { listGameChunks } from '@/lib/db/game-chunks';
import { getCommentUserProfile, listGameComments } from '@/lib/db/game-comments';
import { GAME_LIKE_TARGET, getGameById } from '@/lib/db/games';
import { getLikeMeta } from '@/lib/db/like-queries';
import { createClient } from '@/lib/supabase/server';
import { resolveDisplayName } from '@/lib/users/display-name';
import { UUID_RE } from '@/lib/validations/uuid';

import { PositionAuthorAttribution } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionAuthorAttribution';
import { LikeButton } from '@/app/[locale]/(public)/topics/_components/LikeButton';
import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { toggleGameLikeAction } from '../_actions/game-like';
import { GameReplay } from './GameReplay';
import { OwnerActions } from './OwnerActions';
import { SharedGamePlaySettings } from './SharedGamePlaySettings';

type Props = {
  locale: Locale;
  id: string;
  /** `?comment=<id>` deep-link from a like notification. */
  highlightCommentId?: string;
  /** Side at the bottom of the board, from the `/white` | `/black` path segment. */
  orientation?: 'white' | 'black';
};

/**
 * The shared-game detail body — an inline, steppable replay plus metadata, the
 * entry point for receiving advice. Rendered by both the bare permalink
 * (`/games/shared/[id]`) and the orientation-suffixed route
 * (`/games/shared/[id]/[orientation]`), which only differ by the initial board
 * orientation. Only public / unlisted, non-deleted games are visible.
 */
export async function SharedGameDetailView({ locale, id, highlightCommentId, orientation }: Props) {
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
  const [comments, currentUser, likeMeta, gameChunks, availableChunks] = await Promise.all([
    listGameComments(game.id, user?.id),
    user ? getCommentUserProfile(user.id) : Promise.resolve(null),
    getLikeMeta(GAME_LIKE_TARGET, game.id, user?.id),
    listGameChunks(game.id),
    getAllAvailableChunkOptions(),
  ]);

  return (
    <PageLayout
      title={game.title}
      locale={locale}
      breadcrumb={[{ label: t('list.title'), href: '/games/shared' }, { label: game.title }]}
    >
      <div className="space-y-6">
        {/* How this game was played (blindfold difficulty), shown as icons.
            Renders nothing for a plain sighted game or when no settings were
            captured (legacy games). */}
        {game.playSettings && (
          <SharedGamePlaySettings
            settings={game.playSettings}
            playerColor={game.playerColor}
            locale={locale}
          />
        )}

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
          gameChunks={gameChunks}
          availableChunks={availableChunks}
          currentUser={currentUser}
          isGameOwner={isRegisteredOwner}
          highlightCommentId={highlightCommentId}
          orientation={orientation}
        >
          {game.description && (
            <div className="space-y-2">
              <SectionTitle>{t('detail.descriptionSection')}</SectionTitle>
              <p className="whitespace-pre-wrap text-foreground">{game.description}</p>
            </div>
          )}
        </GameReplay>

        {/* Author attribution — avatar + name + profile link, matching the
            chunk / position UGC pages. Anonymous authors get a fallback name
            and no profile link. */}
        <PositionAuthorAttribution
          profile={author ? { username: author.username, avatarUrl: author.avatarUrl } : null}
          displayName={authorDisplayName}
          createdByLabel={t('detail.sharedBy')}
          locale={locale}
        />

        {/* Like (left) + owner edit/delete and the shared date (right) — same
            row convention as the puzzle / position detail pages. OwnerActions
            renders nothing for non-owners, leaving just the date on the right. */}
        <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
          <LikeButton
            postId={game.id}
            locale={locale}
            topicKey=""
            initialLikeCount={likeMeta.likeCount}
            initialLikedByMe={likeMeta.likedByMe}
            toggleLikeAction={toggleGameLikeAction}
            i18nNamespace="sharedGames.detail"
          />
          <div className="flex items-center gap-4">
            <OwnerActions gameId={game.id} isRegisteredOwner={isRegisteredOwner} locale={locale} />
            <time dateTime={game.createdAt.toISOString()}>
              {game.createdAt.toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
