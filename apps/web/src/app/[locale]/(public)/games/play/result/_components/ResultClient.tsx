'use client';

import { useEffect, useMemo, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { buildOpeningIndex, detectOpening } from '@blindfold-chess/features/chess-core';
import type { ExpInfo } from '@blindfold-chess/features/exp';

import { computeGameStats } from '@/lib/games/compute-game-stats';
import type { GifPreviewSource } from '@/lib/games/gif/preview-frames';
import { hasPlayedGifVariant } from '@/lib/games/gif/preview-frames';
import { toGameFrameSource } from '@/lib/games/gif/to-game-frame-source';
import type { Game } from '@/lib/games/saved-game-types';
import { getSharedGame } from '@/lib/games/shared-game-store';
import { toReviewData } from '@/lib/games/to-review-data';
import type { OpeningCatalogEntry } from '@/lib/openings/detect-game-opening';

import { GameReview } from '@/app/[locale]/(public)/games/shared/[id]/_components/GameReview';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useSharedGameLink } from '../../_hooks/use-shared-game-link';
import { useGameExpGrant } from '../_hooks/use-game-exp-grant';
import { useLoadGame } from '../_hooks/useLoadGame';
import { CompactResultHeader } from './CompactResultHeader';
import { LocalDiscussionPanel } from './LocalDiscussionPanel';
import { LocalGameSocial } from './LocalGameSocial';
import { ResultSkeleton } from './ResultSkeleton';

/** The player (= the viewer), for the "Played by" header. Null when signed out. */
export type ResultPlayer = {
  profile: { username?: string | null; avatarUrl?: string | null } | null;
  displayName: string;
};

type Props = {
  locale: Locale;
  /** Whether the viewer is signed in. Anonymous viewers get the stats gated behind a sign-up CTA. */
  isAuthenticated: boolean;
  /** Exp already granted for this game (resolved server-side on revisit), or null. */
  initialExp: ExpInfo | null;
  /** Opening master, shipped from the server so detection can run on the local game. */
  openingEntries: OpeningCatalogEntry[];
  /** Resolved server-side; anonymous players get a guest name and no profile link. */
  player: ResultPlayer;
};

export function ResultClient({
  locale,
  isAuthenticated,
  initialExp,
  openingEntries,
  player,
}: Props) {
  const t = useTranslations('play');
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = searchParams.get('gameId');
  const loadState = useLoadGame(gameId);

  // Once a game is published, its canonical review is the shared page — with the
  // real comments / chunks / likes — so send the player there instead of the
  // local result screen. Otherwise a game they already published would keep
  // showing the "share to unlock discussion" CTA forever. The local→published
  // mapping lives in localStorage, so this resolves client-side after mount;
  // `replace` keeps the result URL out of history (no redirect loop on Back).
  const [redirecting, setRedirecting] = useState(false);
  useEffect(() => {
    if (!gameId) return;
    const publishedId = getSharedGame(gameId)?.publishedId;
    if (publishedId) {
      setRedirecting(true);
      router.replace(`/${locale}/games/shared/${publishedId}`);
    }
  }, [gameId, locale, router]);

  if (redirecting || loadState.status === 'idle' || loadState.status === 'loading') {
    return <ResultSkeleton />;
  }

  if (loadState.status === 'error') {
    const message =
      loadState.error === 'missing-id' ? t('result.gameIdMissing') : t('result.gameNotFound');
    return (
      <div className="text-center">
        <p className="text-muted-foreground mt-4">{message}</p>
      </div>
    );
  }

  // gameId is guaranteed non-null when status === 'loaded'.
  return (
    <ResultContent
      game={loadState.game}
      gameId={gameId as string}
      locale={locale}
      isAuthenticated={isAuthenticated}
      initialExp={initialExp}
      openingEntries={openingEntries}
      player={player}
    />
  );
}

type ResultContentProps = {
  game: Game;
  gameId: string;
  locale: Locale;
  isAuthenticated: boolean;
  initialExp: ExpInfo | null;
  openingEntries: OpeningCatalogEntry[];
  player: ResultPlayer;
};

function ResultContent({
  game,
  gameId,
  locale,
  isAuthenticated,
  initialExp,
  openingEntries,
  player,
}: ResultContentProps) {
  // The review view model — the same shape the shared game builds from its DB
  // row, so both screens read the result (and everything else) from one mapping.
  const reviewData = toReviewData(game);

  // Opening played — detected client-side from the local game (the result game
  // is never persisted server-side; see detectOpening). Null for custom-start
  // games or lines outside the master.
  const opening = useMemo(() => {
    const index = buildOpeningIndex(openingEntries.map((e) => ({ id: e.slug, fen: e.fen })));
    const match = detectOpening({ moves: game.moves, startingFen: game.startingFen }, index);
    return match ? (openingEntries.find((e) => e.slug === match.id) ?? null) : null;
  }, [openingEntries, game.moves, game.startingFen]);

  // Overview stats power the Exp grant (purity multiplier). The stats *display*
  // is rendered inside GameReview from the same operation logs.
  const stats = useMemo(() => computeGameStats(game.operationLogs ?? []), [game.operationLogs]);

  // Grant (once) the Exp earned for this game. The result screen owns the
  // grant, but — for parity with the shared game review, which shows no Exp —
  // it is no longer *displayed* here; the earned Exp surfaces in the in-game
  // finished-review (`?finished=1`) instead. Guests trigger no grant.
  useGameExpGrant({ gameId, game, stats, isAuthenticated, initialExp });

  // Share routing (open the published game vs. the publish form) and whether it
  // was already published from this browser — shared with the in-play finish
  // flow (useFinishedGameNavigation) via useSharedGameLink.
  const { handleShare, isShared } = useSharedGameLink({ locale, gameId });

  const hasMoves = game.moves.length > 0;

  // The share prompt plays the opening of the GIF this game would produce, to
  // pitch the download that publishing unlocks. Withheld for an unfinished game:
  // the frame builder's termination mark reads the final result, and a game
  // still in progress has none to read.
  const gifPreview = useMemo<GifPreviewSource | null>(() => {
    if (!hasMoves || game.status === 'in_progress') return null;
    const source = toGameFrameSource(game);
    return { source, variant: hasPlayedGifVariant(source) ? 'played' : 'plain' };
  }, [game, hasMoves]);

  // The same review screen as the shared game (games/shared/[id]) — board, move
  // list, blindfold indicator, and stats — sourced from the local game, then the
  // same "Played by" + like/share footer below it. The win/loss/draw label rides
  // at the top of the stats block (statsHeader), not above the board; its
  // wording is first-person here and neutral on the shared game, which third
  // parties read.
  //
  // The publish pitch is made by the modal every engagement action opens, not by
  // an inline card — a card had no counterpart on the shared game and pushed the
  // whole layout down. Which pitch depends on where it was opened from: the
  // footer's share/like actions get the animated-replay one (hence `gifPreview`
  // goes only there), the Discussion tab's compose CTAs get the thread one.
  // Nothing is rendered for a game with no moves: there is nothing to publish,
  // discuss or delete.
  return (
    <div className="space-y-6">
      <GameReview
        {...reviewData}
        detectedOpening={opening}
        locale={locale}
        statsHeader={<CompactResultHeader result={reviewData.result} />}
        social={{
          mode: 'local',
          isAuthenticated,
          // Discussion tab: members-only compose CTAs (join conversation / suggest
          // chunk) that route to sign-in / finish-registration (anonymous /
          // provisional) or a share prompt (registered) — discussion needs both an
          // account and a published game. Render prop: on the opening board the
          // chunk CTA is withheld, matching the published game's whole-game
          // thread (chunks are per-move).
          discussionContent: hasMoves
            ? ({ isInitialPosition }) => (
                <LocalDiscussionPanel
                  onShare={handleShare}
                  isShared={isShared}
                  showChunkCta={!isInitialPosition}
                />
              )
            : null,
        }}
      />

      {hasMoves && (
        <LocalGameSocial
          locale={locale}
          gameId={gameId}
          profile={player.profile}
          displayName={player.displayName}
          // When the game was played, not when it was saved to the catalog —
          // the shared page's counterpart is the publish date.
          playedAt={new Date(game.lastPlayed ?? game.date)}
          onShare={handleShare}
          isShared={isShared}
          gifPreview={gifPreview}
        />
      )}
    </div>
  );
}
