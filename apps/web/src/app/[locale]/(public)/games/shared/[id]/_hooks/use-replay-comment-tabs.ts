'use client';

import { useEffect, useMemo, useState } from 'react';

import type { GameChunkItem } from '@/lib/db/game-chunks';
import type { GameCommentItem } from '@/lib/db/game-comments';

type Params = {
  comments: GameCommentItem[];
  gameChunks: GameChunkItem[];
  /** The ply the move panel anchors to, or null on the overview board. */
  currentPly: number | null;
};

type Result = {
  commentCount: number;
  chunkCount: number;
  activeMoveTab: 'comments' | 'chunks';
  setActiveMoveTab: React.Dispatch<React.SetStateAction<'comments' | 'chunks'>>;
};

/**
 * Per-move discussion / applicable-chunk counts and the tab state for the
 * move panel. Both datasets are already loaded, so the counts are pure
 * client-side filtering. Defaults to comments, but opens straight to chunks on
 * a move that has chunks and no comments — re-evaluated per move, while manual
 * switches persist within a move.
 */
export function useReplayCommentTabs({ comments, gameChunks, currentPly }: Params): Result {
  const commentCount = useMemo(
    () => comments.filter((c) => c.ply === currentPly && c.deletedAt === null).length,
    [comments, currentPly]
  );
  const chunkCount = useMemo(
    () => gameChunks.filter((c) => c.ply === currentPly).length,
    [gameChunks, currentPly]
  );

  const [activeMoveTab, setActiveMoveTab] = useState<'comments' | 'chunks'>('comments');
  useEffect(() => {
    setActiveMoveTab(commentCount === 0 && chunkCount > 0 ? 'chunks' : 'comments');
  }, [currentPly, commentCount, chunkCount]);

  return { commentCount, chunkCount, activeMoveTab, setActiveMoveTab };
}
