import type { OverviewView } from '../_hooks/use-review-overview';

/**
 * The query param that carries the overview block's tab (`?tab=ai-review`).
 *
 * The tab is React state, and the board's position is already mirrored in the
 * URL (`#<half-move>`, see `useReplayUrlSync`); without the tab beside it,
 * leaving the page — a glossary term from a review principle, the author's
 * profile, any link — and coming back restored the move but dropped the tab,
 * landing on the Discussion whatever the viewer had been reading. This param
 * is the same `?tab=` the chunk and preferences pages use.
 */
export const OVERVIEW_TAB_PARAM = 'tab';

const PARAM_VALUE_BY_VIEW = {
  summary: 'summary',
  discussion: 'discussion',
  aiReview: 'ai-review',
} as const satisfies Record<OverviewView, string>;

/** The URL form of a tab, for `?tab=`. */
export function overviewTabParamValue(view: OverviewView): string {
  return PARAM_VALUE_BY_VIEW[view];
}

/**
 * Resolve a `?tab=` value to a tab the page is actually rendering, or `null`
 * when it names none — unknown values, and the AI Review on a page that does
 * not offer it (the result screen, or a viewer with no review to show) all
 * fall back to the page's own default, the same posture as an unknown
 * `?tab=` on the preferences page.
 *
 * A page without the tab row (no stats recorded — `showOverviewTabs` false)
 * accepts nothing: there is no switch for the value to select.
 */
export function parseOverviewTabParam(
  raw: string | null,
  offered: { showOverviewTabs: boolean; aiReview: boolean }
): OverviewView | null {
  if (!offered.showOverviewTabs) return null;
  switch (raw) {
    case PARAM_VALUE_BY_VIEW.summary:
      return 'summary';
    case PARAM_VALUE_BY_VIEW.discussion:
      return 'discussion';
    case PARAM_VALUE_BY_VIEW.aiReview:
      return offered.aiReview ? 'aiReview' : null;
    default:
      return null;
  }
}
