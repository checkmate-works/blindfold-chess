'use client';

import { useMemo } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FiChevronRight } from 'react-icons/fi';

import type { GameChunkItem } from '@/lib/db/game-chunks';
import type { GameCommentItem } from '@/lib/db/game-comments';

import { parseFenMeta } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';
import { computeMoveNumber } from '@/app/[locale]/(public)/practice/(free-play)/recall/_lib/compute-move-number';
import type { Locale } from '@/app/[locale]/_lib/types';

import { buildDiscussionGroups } from '../_lib/build-discussion-groups';
import { buildGameCommentTree } from '../_lib/game-comment-tree';
import { groupChunkLinksBySuggester } from '../_lib/group-chunk-links';
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
  /** Jump the live replay to a move (0-based ply). */
  onJumpToPly: (ply: number) => void;
  locale: Locale;
};

const NOOP_REMOVE = () => Promise.resolve({});

/**
 * The overview discussion feed: every comment + chunk link rolled up by move.
 * Whole-game comments lead; each move group is headed by its notation (e.g.
 * "10...Bg7") which jumps the replay to that ply. Read-only — the per-move view
 * is where you reply / link / delete; this is the table of contents into it.
 */
export function GameDiscussionFeed({
  comments,
  gameChunks,
  notationMoves,
  startingFen,
  onJumpToPly,
  locale,
}: Props) {
  const t = useTranslations('sharedGames');

  const groups = useMemo(() => buildDiscussionGroups(comments, gameChunks), [comments, gameChunks]);

  const moveLabel = useMemo(() => {
    const { startsAsBlack, startMoveNumber } = parseFenMeta(startingFen);
    return (ply: number): string => {
      const san = notationMoves[ply] ?? '';
      const { moveNumber, isWhiteMove } = computeMoveNumber(ply, startsAsBlack, startMoveNumber);
      return isWhiteMove ? `${moveNumber}. ${san}` : `${moveNumber}...${san}`;
    };
  }, [notationMoves, startingFen]);

  return (
    <ul className="space-y-8">
      {groups.map((group) => (
        <li key={group.ply ?? 'whole-game'} className="space-y-4">
          {group.ply === null ? (
            <h3 className="text-sm font-semibold text-foreground">{t('discussion.wholeGame')}</h3>
          ) : (
            <button
              type="button"
              onClick={() => onJumpToPly(group.ply as number)}
              className="inline-flex items-center gap-0.5 text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
            >
              {moveLabel(group.ply)}
              <FiChevronRight className="h-4 w-4" aria-hidden />
            </button>
          )}

          {group.comments.length > 0 && (
            <div className="space-y-6">
              {buildGameCommentTree(group.comments).map((root) => (
                <DiscussionCommentRow key={root.id} node={root} locale={locale} />
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
