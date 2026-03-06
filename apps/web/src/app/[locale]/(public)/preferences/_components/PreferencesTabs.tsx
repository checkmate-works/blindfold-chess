'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import { AppearanceSettings } from './AppearanceSettings';
import { ControlSettings } from './ControlSettings';
import { GameSettings } from './GameSettings';

type Props = {
  locale: string;
};

export function PreferencesTabs({ locale }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const t = useTranslations('Preferences');

  // Use URL parameter directly, fallback to 'game'
  const activeTab = tabParam || 'game';

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tabId);
    router.push(`/${locale}/preferences?${params.toString()}`, { scroll: false });
  };

  const tabs = [
    { id: 'game', label: t('tabs.board') },
    { id: 'controls', label: t('tabs.controls') },
    { id: 'appearance', label: t('tabs.appearance') },
  ];

  return (
    <div>
      {/* Tab Navigation */}
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

      {/* Tab Content */}
      <div className="py-6">
        {activeTab === 'game' && <GameSettings />}
        {activeTab === 'controls' && <ControlSettings />}
        {activeTab === 'appearance' && <AppearanceSettings />}
      </div>
    </div>
  );
}
