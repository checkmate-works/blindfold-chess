'use client';

import { tabItemClass, tabsRowClass, tabsScrollClass } from '@/app/[locale]/_components/tab-styles';

import type { OverviewView } from '../_hooks/use-review-overview';

/**
 * The segmented switch shown above the review's overview block —
 * [Summary | Discussion], plus an [AI Review] tab when the surface offers it
 * (the live shared page passes `aiReviewLabel`; the local result screen does
 * not, since an unpublished game has no server-side review to anchor).
 */
export function ReviewOverviewTabs({
  active,
  onChange,
  summaryLabel,
  discussionLabel,
  aiReviewLabel,
}: {
  active: OverviewView;
  onChange: (view: OverviewView) => void;
  summaryLabel: string;
  discussionLabel: string;
  /** When set, renders the AI Review tab with this label. */
  aiReviewLabel?: string;
}) {
  const views: Array<{ key: OverviewView; label: string }> = [
    { key: 'summary', label: summaryLabel },
    { key: 'discussion', label: discussionLabel },
    ...(aiReviewLabel ? [{ key: 'aiReview' as const, label: aiReviewLabel }] : []),
  ];

  return (
    <div className={tabsScrollClass.underline}>
      <div role="tablist" className={tabsRowClass.underline}>
        {views.map(({ key, label }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(key)}
              className={tabItemClass('underline', isActive)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
