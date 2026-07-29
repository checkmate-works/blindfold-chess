'use client';

import { useMemo } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Side } from '@blindfold-chess/types';
import { FiChevronRight } from 'react-icons/fi';

import type { GameChunkItem } from '@/lib/db/game-chunks';
import type { GameCommentItem } from '@/lib/db/game-comments';

import { parseFenMeta } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';
import type { Locale } from '@/app/[locale]/_lib/types';

import { buildDiscussionGroups } from '../_lib/build-discussion-groups';
import { buildGameCommentTree } from '../_lib/game-comment-tree';
import { groupChunkLinksBySuggester } from '../_lib/group-chunk-links';
import { formatPlyLabel } from '../_lib/replay-derivations';
import { DiscussionCommentRow } from './DiscussionCommentRow';
import { GameChunkLinkCard } from './GameChunkLinkCard';

type Props = {
  /** All comments for the game (every ply). */
  comments: GameCommentItem[];
  /** All chunk links for the game (every ply). */
  gameChunks: GameChunkItem[];
  /** SAN moves, for building the per-group move label. */
  notationMoves: string[];
  /** Game's starting FEN, for the move-number base. */
  startingFen: string | null;
  /** Passed through to `GameCommentBody` for the board-orientation of move previews. */
  playerColor: Side;
  /** Jump the live replay to a move (0-based ply). */
  onJumpToPly: (ply: number) => void;
  locale: Locale;
};

const NOOP_REMOVE = () => Promise.resolve({});

/**
 * The overview discussion feed: every per-move comment + chunk link rolled up
 * by move. Each group is headed by its notation (e.g. "10...Bg7") which jumps
 * the replay to that ply. Read-only — the per-move view is where you reply /
 * link / delete; this is the table of contents into it. Whole-game comments
 * (`ply = NULL`) are NOT part of the index: they have no per-move view to jump
 * to, so their thread renders interactively above this feed (see the
 * whole-game section in `GameReview`). Renders nothing when no move has
 * contributions.
 */
export function GameDiscussionFeed({
  comments,
  gameChunks,
  notationMoves,
  startingFen,
  playerColor,
  onJumpToPly,
  locale,
}: Props) {
  const t = useTranslations('sharedGames');

  const groups = useMemo(
    () => buildDiscussionGroups(comments, gameChunks).filter((g) => g.ply !== null),
    [comments, gameChunks]
  );

  const moveLabel = useMemo(() => {
    const { startsAsBlack, startMoveNumber } = parseFenMeta(startingFen);
    return (ply: number): string =>
      formatPlyLabel(ply, notationMoves[ply] ?? '', startsAsBlack, startMoveNumber);
  }, [notationMoves, startingFen]);

  if (groups.length === 0) return null;

  return (
    <ul className="space-y-8">
      {groups.map((group) => (
        <li key={group.ply} className="space-y-4">
          <button
            type="button"
            onClick={() => onJumpToPly(group.ply as number)}
            className="inline-flex items-center gap-0.5 text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
          >
            {moveLabel(group.ply as number)}
            <FiChevronRight className="h-4 w-4" aria-hidden />
          </button>

          {group.comments.length > 0 && (
            <div className="space-y-6">
              {buildGameCommentTree(group.comments).map((root) => (
                <DiscussionCommentRow
                  key={root.id}
                  node={root}
                  locale={locale}
                  moves={notationMoves}
                  startingFen={startingFen}
                  playerColor={playerColor}
                />
              ))}
            </div>
          )}

          {group.chunks.length > 0 && (
            <ul className="space-y-6">
              {groupChunkLinksBySuggester(group.chunks).map((run) => (
                <GameChunkLinkCard
                  key={run[0].id}
                  items={run}
                  badge={t('chunks.badge')}
                  locale={locale}
                  canRemove={() => false}
                  onRemove={NOOP_REMOVE}
                />
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
