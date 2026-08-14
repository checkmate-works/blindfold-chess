'use client';

import { useMemo, useState } from 'react';

import type { GameChunkItem } from '@/lib/db/game-chunks';
import type { GameCommentItem } from '@/lib/db/game-comments';

import { type DiscussionGroup, buildDiscussionGroups } from '../_lib/build-discussion-groups';

/**
 * The overview block's tab set. `aiReview` participates only on the live
 * (shared) page and only when the caller offers it — see `ReviewOverviewTabs`.
 */
export type OverviewView = 'summary' | 'discussion' | 'aiReview';

export type UseReviewOverviewReturn = {
  discussionGroups: DiscussionGroup[];
  discussionCount: number;
  hasDiscussion: boolean;
  /** Whether the segmented tab switch is shown. */
  showOverviewTabs: boolean;
  /** The user's tab choice (only honored while the tabs exist). */
  overviewView: OverviewView;
  setOverviewView: (view: OverviewView) => void;
  /** The tab actually rendered — falls back to whichever side is non-empty. */
  activeOverviewView: OverviewView;
};

/**
 * State for the review's overview block: all comments + chunk links rolled up
 * by move, plus the [Summary | Discussion] segmented switch. The switch is
 * shown whenever the stats side has content; leads with the discussion when
 * there is any (this is an advice page), the stats summary otherwise.
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
  // The Discussion side always has content — the whole-game thread (or its
  // compose CTA) — so an empty discussion no longer hides the switch; matching
  // the result screen, which shows both tabs from the start. Only a missing
  // Summary (no stats recorded — legacy games) collapses the block to the
  // discussion side alone.
  const showOverviewTabs = hasSummary;

  const [overviewView, setOverviewView] = useState<OverviewView>(
    hasDiscussion ? 'discussion' : 'summary'
  );
  const activeOverviewView = showOverviewTabs ? overviewView : 'discussion';

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
