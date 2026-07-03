'use client';

import { useMemo, useState } from 'react';

import type { GameChunkItem } from '@/lib/db/game-chunks';
import type { GameCommentItem } from '@/lib/db/game-comments';

import { type DiscussionGroup, buildDiscussionGroups } from '../_lib/build-discussion-groups';

export type UseReviewOverviewReturn = {
  discussionGroups: DiscussionGroup[];
  discussionCount: number;
  hasDiscussion: boolean;
  /** Whether the [Summary | Discussion] segmented switch is shown. */
  showOverviewTabs: boolean;
  /** The user's tab choice (only honored while both tabs exist). */
  overviewView: 'summary' | 'discussion';
  setOverviewView: (view: 'summary' | 'discussion') => void;
  /** The tab actually rendered — falls back to whichever side is non-empty. */
  activeOverviewView: 'summary' | 'discussion';
};

/**
 * State for the review's overview block: all comments + chunk links rolled up
 * by move, plus the [Summary | Discussion] segmented switch. The overview
 * offers the switch when both the stats and some activity exist; otherwise it
 * shows whichever is non-empty. Leads with the discussion when there is any
 * (this is an advice page); falls back to the stats summary otherwise.
 */
export function useReviewOverview({
  comments,
  gameChunks,
  hasSummary,
}: {
  comments: GameCommentItem[];
  gameChunks: GameChunkItem[];
  /** Whether the stats-summary side has content to show. */
  hasSummary: boolean;
}): UseReviewOverviewReturn {
  const discussionGroups = useMemo(
    () => buildDiscussionGroups(comments, gameChunks),
    [comments, gameChunks]
  );
  const discussionCount = useMemo(
    () => discussionGroups.reduce((n, g) => n + g.comments.length + g.chunks.length, 0),
    [discussionGroups]
  );
  const hasDiscussion = discussionGroups.length > 0;
  const showOverviewTabs = hasSummary && hasDiscussion;

  const [overviewView, setOverviewView] = useState<'summary' | 'discussion'>(
    hasDiscussion ? 'discussion' : 'summary'
  );
  const activeOverviewView = showOverviewTabs
    ? overviewView
    : hasDiscussion
      ? 'discussion'
      : 'summary';

  return {
    discussionGroups,
    discussionCount,
    hasDiscussion,
    showOverviewTabs,
    overviewView,
    setOverviewView,
    activeOverviewView,
  };
}
