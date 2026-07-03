'use client';

import { tabItemClass, tabsRowClass } from '@/app/[locale]/_components/tab-styles';

/**
 * The [Summary | Discussion] segmented switch shown above the review's
 * overview block (shared by the live opening-board branch and the local
 * result-screen branch, which differ only in the discussion label).
 */
export function ReviewOverviewTabs({
  active,
  onChange,
  summaryLabel,
  discussionLabel,
}: {
  active: 'summary' | 'discussion';
  onChange: (view: 'summary' | 'discussion') => void;
  summaryLabel: string;
  discussionLabel: string;
}) {
  return (
    <div role="tablist" className={tabsRowClass.underline}>
      {(['summary', 'discussion'] as const).map((view) => {
        const isActive = active === view;
        return (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(view)}
            className={tabItemClass('underline', isActive)}
          >
            {view === 'summary' ? summaryLabel : discussionLabel}
          </button>
        );
      })}
    </div>
  );
}
