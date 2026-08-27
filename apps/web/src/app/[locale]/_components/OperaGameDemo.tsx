'use client';

import { useMemo, useState } from 'react';

import nextDynamic from 'next/dynamic';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
// The pure subpath, not the chess-core barrel: this component is the one
// half of the demo that must stay chess.js-free.
import { formatMovesToPgn } from '@blindfold-chess/features/chess-core/pgn-format';

import { VerticalMoveList } from '@/app/[locale]/(public)/games/play/_components/VerticalMoveList';

import { OPERA_GAME_MOVES, OPERA_GAME_RESULT } from './opera-game-moves';

// The board modal is where chess.js enters the graph, and this demo is
// rendered through `MarkdownDemoImage` — the client island shared by every
// markdown route. Loading the modal on first tap keeps chess.js out of all
// of them; the score below is strings and a pure formatter.
const OperaGameReplayModal = nextDynamic(
  () => import('./OperaGameReplayModal').then((m) => m.OperaGameReplayModal),
  { ssr: false }
);

/**
 * The algebraic-notation article's sample game (`![demo:opera-game]()`),
 * rendered as a score where every move is a button: tapping one opens the
 * replay modal at that position, so the notation being taught and the
 * position it denotes stay one tap apart.
 *
 * The score itself is `VerticalMoveList` inside the same card chrome the
 * games/play and recall move panels use, so it is not merely similar to the
 * move list elsewhere in the app — it is the same component. Nothing is lost
 * by not styling it as a code block: that list is monospace already, which
 * is the part an article about written notation actually needs.
 *
 * `currentPosition={-1}` because the article surface has no cursor of its
 * own — the modal owns the position, and this list is only ever an entry
 * point into it, so no row is highlighted.
 */
export function OperaGameDemo() {
  // `Common` because the markdown pipeline mounts on nearly every route
  // subtree, and Common is the one namespace every scoped i18n dictionary
  // already ships — see the @design note in `OperaGameReplayModal`.
  const t = useTranslations('Common.operaGame');
  // Ply index the modal is open at; null = closed (modal unmounted, so a
  // reopened modal re-seeds `usePgnReplay` at the newly tapped move).
  const [openPly, setOpenPly] = useState<number | null>(null);

  // The game runs from the standard start, so White moves first (`false`)
  // and the numbering begins at 1.
  const formattedPgn = useMemo(() => formatMovesToPgn(OPERA_GAME_MOVES, false, 1), []);

  return (
    <div className="my-8">
      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 bg-muted/30 rounded-t-lg">
          <span className="text-foreground font-medium">{t('title')}</span>
        </div>

        <div className="p-4 font-mono">
          <VerticalMoveList
            formattedPgn={formattedPgn}
            currentPosition={-1}
            onNavigateToPosition={setOpenPly}
          />
          {/* The result is notation too, and the last row has no Black move
              to hold it. Same row geometry as the list so the column edges
              line up. */}
          <div className="flex items-center text-sm">
            <span className="w-10 shrink-0 pr-2" aria-hidden />
            <span className="flex-1 px-2 py-0.5 text-muted-foreground">{OPERA_GAME_RESULT}</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mt-2">{t('hint')}</p>

      {openPly !== null && (
        <OperaGameReplayModal initialIndex={openPly} onClose={() => setOpenPly(null)} />
      )}
    </div>
  );
}
