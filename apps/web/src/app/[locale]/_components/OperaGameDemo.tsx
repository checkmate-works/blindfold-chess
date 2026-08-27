'use client';

import { useState } from 'react';

import nextDynamic from 'next/dynamic';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { OPERA_GAME_MOVES, OPERA_GAME_RESULT } from './opera-game-moves';

// The board modal is where chess.js enters the graph, and this demo is
// rendered through `MarkdownDemoImage` — the client island shared by every
// markdown route. Loading the modal on first tap keeps chess.js out of all
// of them; the score below is plain strings and ships with the article.
const OperaGameReplayModal = nextDynamic(
  () => import('./OperaGameReplayModal').then((m) => m.OperaGameReplayModal),
  { ssr: false }
);

/**
 * The algebraic-notation article's sample game (`![demo:opera-game]()`),
 * rendered as a score where every move is a button: tapping one opens the
 * replay modal at that position, so the notation being taught and the
 * position it denotes stay one tap apart. The layout deliberately keeps the
 * look of the code block it replaced — monospace, one numbered move pair per
 * line — because the article is teaching what a written score looks like.
 */
export function OperaGameDemo() {
  // `Common` because the markdown pipeline mounts on nearly every route
  // subtree, and Common is the one namespace every scoped i18n dictionary
  // already ships — see the @design note in `OperaGameReplayModal`.
  const t = useTranslations('Common.operaGame');
  // Ply index the modal is open at; null = closed (modal unmounted, so a
  // reopened modal re-seeds `usePgnReplay` at the newly tapped move).
  const [openPly, setOpenPly] = useState<number | null>(null);

  const rows: { number: number; whitePly: number; blackPly: number | null }[] = [];
  for (let ply = 0; ply < OPERA_GAME_MOVES.length; ply += 2) {
    rows.push({
      number: ply / 2 + 1,
      whitePly: ply,
      blackPly: ply + 1 < OPERA_GAME_MOVES.length ? ply + 1 : null,
    });
  }

  const moveButton = (ply: number) => (
    <button
      type="button"
      className="px-1.5 py-0.5 rounded text-left transition-colors hover:bg-muted/40 hover:text-primary"
      onClick={() => setOpenPly(ply)}
    >
      {OPERA_GAME_MOVES[ply]}
    </button>
  );

  return (
    <div className="my-8">
      <div className="bg-secondary p-4 rounded-md overflow-x-auto">
        <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-0.5 w-max font-mono text-sm">
          {rows.map((row) => (
            <div key={row.number} className="contents">
              <span className="text-muted-foreground py-0.5">{row.number}.</span>
              {moveButton(row.whitePly)}
              {row.blackPly !== null ? (
                moveButton(row.blackPly)
              ) : (
                <span className="px-1.5 py-0.5 text-muted-foreground">{OPERA_GAME_RESULT}</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-2">{t('hint')}</p>
      {openPly !== null && (
        <OperaGameReplayModal initialIndex={openPly} onClose={() => setOpenPly(null)} />
      )}
    </div>
  );
}
