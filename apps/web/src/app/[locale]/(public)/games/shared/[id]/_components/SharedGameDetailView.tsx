import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getStartingFen } from '@blindfold-chess/features/chess-core';

import { getLinkableChunkOptionsForViewer } from '@/lib/chunks/queries';
import { listGameChunks } from '@/lib/db/game-chunks';
import { getCommentUserProfile, listGameComments } from '@/lib/db/game-comments';
import { getGameById } from '@/lib/db/games-read';
import { GAME_LIKE_TARGET, getLikeMeta } from '@/lib/db/like-queries';
import { hasPlayedGifVariant } from '@/lib/games/gif/preview-frames';
import { gameUsedNotablePlaySettings } from '@/lib/games/play-settings-log';
import { detectGameOpening } from '@/lib/openings/detect-game-opening';
import { createClient } from '@/lib/supabase/server';
import { resolveDisplayName } from '@/lib/users/display-name';
import { UUID_RE } from '@/lib/validations/uuid';

import { GameSocialFooter } from '@/app/[locale]/(public)/games/_components/GameSocialFooter';
import { LikeButton } from '@/app/[locale]/(public)/topics/_components/LikeButton';
import { MoveNotationText } from '@/app/[locale]/(public)/topics/_components/MoveNotationText';
import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import type { Locale } from '@/app/[locale]/_lib/types';

import { toggleGameLikeAction } from '../_actions/game-like';
import { ClaimGameBanner } from './ClaimGameBanner';
import { GameHelpTour } from './GameHelpTour';
import { GameOutcomeLabel } from './GameOutcomeLabel';
import { GameReview } from './GameReview';
import { OwnerActions } from './OwnerActions';
import { ShareMenu } from './ShareMenu';

type Props = {
  locale: Locale;
  id: string;
  /** `?comment=<id>` deep-link from a like notification. */
  highlightCommentId?: string;
  /** Side at the bottom of the board, from the `?color=white|black` URL param. */
  orientation?: 'white' | 'black';
};

/**
 * The shared-game detail body — an inline, steppable replay plus metadata, the
 * entry point for receiving advice. Only public, non-deleted games are visible.
 */
export async function SharedGameDetailView({ locale, id, highlightCommentId, orientation }: Props) {
  if (!UUID_RE.test(id)) notFound();

  const detail = await getGameById(id);
  if (!detail) notFound();

  const t = await getTranslations({ locale, namespace: 'sharedGames' });
  const { game, author } = detail;
  const authorDisplayName = author ? resolveDisplayName(author) : t('detail.guest');

  // Opening is derived from the moves (see detectGameOpening); null for
  // custom-start games or lines outside the master. Rendered (with the player
  // colour) inside GameReview, above the stats block.
  const opening = await detectGameOpening({ moves: game.moves, startingFen: game.startingFen });

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
    // Published catalog + the viewer's own drafts, so a chunk just authored
    // from a position on this very board can be linked back to it without a
    // publish round-trip. See `linkableChunkPredicate`.
    getLinkableChunkOptionsForViewer(user?.id ?? null),
  ]);

  // Whether to offer the "as played" GIF — shared with the pre-publish teaser
  // on the result screen, so the two never disagree about which variant exists.
  //
  // The embed draws no annotations, so it needs only the first half of that
  // test: its "as played" view differs from the revealed board only when the
  // blindfold settings themselves did something.
  const canReproduce =
    game.playSettings != null &&
    gameUsedNotablePlaySettings(game.playSettings, game.playSettingsLog);
  const hasPlayedVariant = hasPlayedGifVariant(game);

  return (
    <PageLayout
      title={game.title}
      locale={locale}
      titleAction={<GameHelpTour />}
      breadcrumb={[{ label: t('list.title'), href: '/games/shared' }, { label: game.title }]}
    >
      <div className="space-y-6">
        {/* Account-linking funnel for the anonymous publisher's own browser —
            renders nothing for everyone else (no token / already authored). */}
        <ClaimGameBanner gameId={game.id} isAuthorless={game.authorId == null} locale={locale} />
        {/* Board + move list (games/play layout); the description sits below
            the board, above the stats, via GameReview's slot. The blindfold
            difficulty (board visibility + piece obfuscation) is surfaced inside
            the replay, above the board, as a position-aware indicator that
            tracks the displayed move — see PlaySettingsIndicator. */}
        <GameReview
          moves={game.moves}
          startingFen={game.startingFen}
          setupPlies={game.setupPlies}
          playerColor={game.playerColor}
          result={game.result}
          detectedOpening={opening}
          engineConfig={game.engineConfig}
          operationLogs={game.operationLogs}
          playSettings={game.playSettings ?? null}
          playSettingsLog={game.playSettingsLog ?? null}
          locale={locale}
          orientation={orientation}
          statsHeader={
            <GameOutcomeLabel key="outcome" result={game.result} playerColor={game.playerColor} />
          }
          social={{
            mode: 'live',
            // Real auth state — distinct from `currentUser` (the comment
            // profile), so a signed-in viewer without one still sees the stats
            // instead of the members-only gate.
            isAuthenticated: user != null,
            gameId: game.id,
            comments,
            gameChunks,
            availableChunks,
            currentUser,
            isGameOwner: isRegisteredOwner,
            highlightCommentId,
          }}
        >
          {game.description && (
            <div className="space-y-2">
              <SectionTitle>{t('detail.descriptionSection')}</SectionTitle>
              <p className="whitespace-pre-wrap text-foreground">
                {/* A description's line runs from the game's own start
                    (game.startingFen, NULL = standard start), the same root
                    detectGameOpening replays against. */}
                <MoveNotationText
                  text={game.description}
                  locale={locale}
                  fen={game.startingFen ?? getStartingFen()}
                />
              </p>
            </div>
          )}
        </GameReview>

        {/* Author header + engagement row, in the layout the result screen
            shares (see GameSocialFooter). Anonymous authors get a fallback
            name and no profile link. OwnerActions renders the whole "⋯" menu
            client-side (ownership can hinge on this browser's manage token)
            and returns null for non-owners. */}
        <GameSocialFooter
          profile={author ? { username: author.username, avatarUrl: author.avatarUrl } : null}
          displayName={authorDisplayName}
          playedByLabel={t('detail.playedBy')}
          locale={locale}
          playedAt={game.createdAt}
          menu={
            <OwnerActions gameId={game.id} isRegisteredOwner={isRegisteredOwner} locale={locale} />
          }
          like={
            <LikeButton
              postId={game.id}
              locale={locale}
              topicKey=""
              initialLikeCount={likeMeta.likeCount}
              initialLikedByMe={likeMeta.likedByMe}
              toggleLikeAction={toggleGameLikeAction}
              i18nNamespace="sharedGames.detail"
            />
          }
          share={
            <ShareMenu
              gameId={game.id}
              title={game.title}
              locale={locale}
              hasPlayedVariant={hasPlayedVariant}
              canReproduce={canReproduce}
            />
          }
        />
      </div>

      {/* Content-bottom ad, between the review and the breadcrumb — same slot and
          position as the result screen (games/play/result). */}
      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
