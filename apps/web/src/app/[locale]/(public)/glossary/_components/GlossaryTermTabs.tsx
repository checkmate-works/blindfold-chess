'use client';

import { type ReactNode, useId, useState } from 'react';

import { tabItemClass, tabsRowClass } from '@/app/[locale]/_components/tab-styles';

type TabKey = 'description' | 'problems';

type Props = {
  descriptionLabel: string;
  problemsLabel: string;
  description: ReactNode;
  problems: ReactNode;
};

/**
 * Client-state [Description | Problems] tab switch for the glossary term page.
 *
 * Both panels are server-rendered and passed in as props, and both stay in
 * the DOM (the inactive one hidden via `hidden`) so the term page remains
 * statically generated and the linked-problem hrefs stay crawlable. Reuses
 * the shared `tab-styles` so it matches the underline tabs on chunk / profile
 * pages.
 */
export function GlossaryTermTabs({
  descriptionLabel,
  problemsLabel,
  description,
  problems,
}: Props) {
  const [active, setActive] = useState<TabKey>('description');
  const baseId = useId();
  const tabId = (key: TabKey) => `${baseId}-tab-${key}`;
  const panelId = (key: TabKey) => `${baseId}-panel-${key}`;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'description', label: descriptionLabel },
    { key: 'problems', label: problemsLabel },
  ];

  return (
    <div>
      <div role="tablist" className={tabsRowClass.underline}>
        {tabs.map(({ key, label }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              id={tabId(key)}
              aria-selected={isActive}
              aria-controls={panelId(key)}
              onClick={() => setActive(key)}
              className={tabItemClass('underline', isActive)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={panelId('description')}
        aria-labelledby={tabId('description')}
        hidden={active !== 'description'}
        className="mt-6"
      >
        {description}
      </div>
      <div
        role="tabpanel"
        id={panelId('problems')}
        aria-labelledby={tabId('problems')}
        hidden={active !== 'problems'}
        className="mt-6"
      >
        {problems}
      </div>
    </div>
  );
}
