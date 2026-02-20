'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

type Tab = {
  label: string;
  content: ReactNode;
};

type Props = {
  tabs: Tab[];
};

export function PracticeTabs({ tabs }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div>
      <div className="flex gap-2 border-b border-border" role="tablist">
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            role="tab"
            aria-selected={activeIndex === index}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeIndex === index
                ? 'border-b-2 border-foreground text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveIndex(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-6" role="tabpanel">
        {tabs[activeIndex].content}
      </div>
    </div>
  );
}
