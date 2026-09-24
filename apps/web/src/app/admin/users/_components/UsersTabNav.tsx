'use client';

import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';

type Tab = {
  id: string;
  label: string;
};

type Props = {
  tabs: Tab[];
};

export function UsersTabNav({ tabs }: Props) {
  const [{ tab: activeTab }, setParams] = useQueryStates({
    tab: parseAsString.withDefault('list'),
    page: parseAsInteger.withDefault(1),
  });

  const handleTabChange = (tabId: string) => {
    setParams({ tab: tabId, page: null }, { history: 'push', shallow: false });
  };

  return (
    <div className="border-b border-border">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            aria-pressed={activeTab === tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`rounded-t-md border-b-2 px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === tab.id
                ? 'border-primary bg-accent font-semibold text-accent-foreground'
                : 'border-transparent font-medium text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
