'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { buildOpeningIndex, detectOpening } from '@blindfold-chess/features/chess-core';
import type { ExpInfo } from '@blindfold-chess/features/exp';
import { FaChartLine, FaChessBoard } from 'react-icons/fa';

import { engineConfigToUrlParams } from '@/lib/engines';
import { computeGameStats } from '@/lib/games/compute-game-stats';
import type { Game } from '@/lib/games/saved-game-types';
import { getSharedGame } from '@/lib/games/shared-game-store';
import { toReviewData } from '@/lib/games/to-review-data';
import type { OpeningCatalogEntry } from '@/lib/openings/detect-game-opening';

import { GameReview } from '@/app/[locale]/(public)/games/shared/[id]/_components/GameReview';
import { AuthPromptModal } from '@/app/[locale]/_components/AuthPromptModal';
import { useAuthGuard } from '@/app/[locale]/_hooks/use-auth-guard';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useNotation } from '../../_hooks';
import { buildPostmortemPath } from '../../_lib';
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
  const t = useTranslations('play');
  const router = useRouter();
  // Postmortem is a members-only feature; anonymous viewers get a sign-up
  // prompt instead of the review screen.
  const { guardAction, isModalOpen: isAuthModalOpen, closeModal: closeAuthModal } = useAuthGuard();

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

  // Notation is still needed for the postmortem deep-link path (below); the
  // board / move-list rendering itself now lives inside GameReview.
  const { formattedPgn } = useNotation({
    initialMoves: game.moves,
    startingFen: game.startingFen,
  });

  // Overview stats power the Exp grant (purity multiplier). The stats *display*
  // is rendered inside GameReview from the same operation logs.
  const stats = useMemo(() => computeGameStats(game.operationLogs ?? []), [game.operationLogs]);

  // Grant (once) the Exp earned for this game. The result screen owns the
  // grant, but — for parity with the shared game review, which shows no Exp —
  // it is no longer *displayed* here; the earned Exp surfaces in the in-game
  // finished-review (`?finished=1`) instead. Guests trigger no grant.
  useGameExpGrant({ gameId, game, stats, isAuthenticated, initialExp });

  // Has this game already been shared from this browser? Read client-side after
  // mount (localStorage) so the share CTA can point at the published game
  // instead of offering to publish it again. Null on the server / first render.
  const [sharedPublishedId, setSharedPublishedId] = useState<string | null>(null);
  useEffect(() => {
    setSharedPublishedId(getSharedGame(gameId)?.publishedId ?? null);
  }, [gameId]);

  const handlePostmortem = useCallback(() => {
    router.push(
      buildPostmortemPath({
        locale,
        formattedPgn,
        playerColor: game.playerColor,
        moves: game.moves,
        engineConfig: game.engineConfig,
        gameId,
        startingFen: game.startingFen,
      })
    );
  }, [game, formattedPgn, gameId, locale, router]);

  // Reopen the finished game in the familiar game UI (read-only). Mirrors the
  // games-list params and adds `finished=1` so PlayClient renders the
  // finished-game view instead of bouncing back here. See PlayClient.
  const openFinishedGame = useCallback(() => {
    const params = new URLSearchParams({
      color: game.playerColor,
      ...engineConfigToUrlParams(game.engineConfig),
      moves: JSON.stringify(game.moves),
      gameId,
      finished: '1',
    });
    router.push(`/${locale}/games/play?${params.toString()}`);
  }, [game, gameId, locale, router]);

  // Share this game: open the already-published game if it exists (tracked in
  // localStorage), otherwise go to the publish form.
  const handleShare = useCallback(() => {
    router.push(
      sharedPublishedId
        ? `/${locale}/games/shared/${sharedPublishedId}`
        : `/${locale}/games/shared/new?gameId=${gameId}`
    );
  }, [router, locale, gameId, sharedPublishedId]);

  const hasMoves = game.moves.length > 0;

  return (
    <div className="space-y-8">
      {/* The same review screen as the shared game (games/shared/[id]) — board,
          move list, blindfold indicator, and stats — sourced from the local
          game. The win/loss/draw label rides at the top of the stats block
          (statsHeader), not above the board. In `local` mode there is no
          persisted game to anchor comments / chunks / likes to, so the share
          CTA sits where the discussion would be. */}
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
            <LocalDiscussionPanel onShare={handleShare} isShared={sharedPublishedId !== null} />
          ) : null,
          // Postmortem / reopen-finished-game actions live under the Summary tab
          // only — they are review actions, not relevant on the Discussion tab.
          summaryActions: hasMoves ? (
            <div className="flex flex-col items-center gap-3">
              <Button
                variant="primary"
                size="lg"
                icon={<FaChartLine className="h-5 w-5" />}
                onClick={() => guardAction(handlePostmortem)}
                className="w-full rounded-xl font-medium"
              >
                {t('postmortem')}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                icon={<FaChessBoard className="h-5 w-5" />}
                onClick={() => openFinishedGame()}
                className="w-full rounded-xl font-medium"
              >
                {t('result.openFinishedGame')}
              </Button>
            </div>
          ) : null,
        }}
      />

      {/* Sign-up prompt shown when an anonymous viewer taps the postmortem
          button (members-only feature). */}
      {isAuthModalOpen && <AuthPromptModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />}
    </div>
  );
}
