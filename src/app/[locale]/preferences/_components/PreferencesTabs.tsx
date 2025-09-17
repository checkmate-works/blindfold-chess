'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ThemeSelector } from './ThemeSelector';

interface PreferencesTabsProps {
  locale: string;
}

export function PreferencesTabs({}: PreferencesTabsProps) {
  const [activeTab, setActiveTab] = useState('appearance');
  const t = useTranslations('Preferences');

  const tabs = [{ id: 'appearance', label: t('tabs.appearance') }];

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="py-6">
        {activeTab === 'appearance' && (
          <div className="max-w-2xl">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">
                  {t('appearance.theme')}
                </h4>
                <ThemeSelector />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
