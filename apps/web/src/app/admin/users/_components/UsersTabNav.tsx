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
            onClick={() => handleTabChange(tab.id)}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
