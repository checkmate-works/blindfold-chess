'use client';

import { useMemo } from 'react';

import { useSearchParams } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { buildOpeningIndex, detectOpening } from '@blindfold-chess/features/chess-core';
import type { ExpInfo } from '@blindfold-chess/features/exp';

import { computeGameStats } from '@/lib/games/compute-game-stats';
import type { Game } from '@/lib/games/saved-game-types';
import { toReviewData } from '@/lib/games/to-review-data';
import type { OpeningCatalogEntry } from '@/lib/openings/detect-game-opening';

import { GameReview } from '@/app/[locale]/(public)/games/shared/[id]/_components/GameReview';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useSharedGameLink } from '../../_hooks/use-shared-game-link';
import { useGameExpGrant } from '../_hooks/use-game-exp-grant';
import { useLoadGame } from '../_hooks/useLoadGame';
import { CompactResultHeader } from './CompactResultHeader';
import { LocalDiscussionPanel } from './LocalDiscussionPanel';
import { ResultSkeleton } from './ResultSkeleton';

type Props = {
  locale: Locale;
  /** Whether the viewer is signed in. Anonymous viewers get the stats gated behind a sign-up CTA. */
  isAuthenticated: boolean;
  /** Exp already granted for this game (resolved server-side on revisit), or null. */
  initialExp: ExpInfo | null;
  /** Opening master, shipped from the server so detection can run on the local game. */
  openingEntries: OpeningCatalogEntry[];
};

export function ResultClient({ locale, isAuthenticated, initialExp, openingEntries }: Props) {
  const t = useTranslations('play');
  const searchParams = useSearchParams();
  const gameId = searchParams.get('gameId');
  const loadState = useLoadGame(gameId);

  if (loadState.status === 'idle' || loadState.status === 'loading') {
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
};

function ResultContent({
  game,
  gameId,
  locale,
  isAuthenticated,
  initialExp,
  openingEntries,
}: ResultContentProps) {
  // Derive player result from game status.
  const playerResult = game.status === 'win' ? 'win' : game.status === 'loss' ? 'loss' : 'draw';

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

  // The same review screen as the shared game (games/shared/[id]) — board, move
  // list, blindfold indicator, and stats — sourced from the local game. The
  // win/loss/draw label rides at the top of the stats block (statsHeader), not
  // above the board. Postmortem / open-finished-game are intentionally NOT
  // surfaced here: this review is the main destination, and the game is one tap
  // away via the breadcrumb (see ResultBreadcrumb), from which Recall is
  // reachable. In `local` mode there is no persisted game to anchor comments /
  // chunks / likes to, so the share CTA sits where the discussion would be.
  return (
    <GameReview
      {...toReviewData(game)}
      detectedOpening={opening}
      locale={locale}
      statsHeader={<CompactResultHeader result={playerResult} />}
      social={{
        mode: 'local',
        isAuthenticated,
        // Discussion tab mirrors the shared game's compose CTAs; activating one
        // routes to sign-in (signed out) or a share prompt (signed in), since a
        // local game must be published before it can be discussed.
        discussionContent: hasMoves ? (
          <LocalDiscussionPanel onShare={handleShare} isShared={isShared} />
        ) : null,
      }}
    />
  );
}
