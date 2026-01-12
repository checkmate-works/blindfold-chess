'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import { isAdsSystemEnabled } from '@/lib/ads/config';

import { AdSettings } from './AdSettings';
import { ControlSettings } from './ControlSettings';
import { GameSettings } from './GameSettings';
import { ThemeSelector } from './ThemeSelector';

type Props = {
  locale: string;
};

export function PreferencesTabs({ locale }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const t = useTranslations('Preferences');
  const adsSystemEnabled = isAdsSystemEnabled();

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
    // システムレベルで広告が有効な場合のみ広告タブを表示
    ...(adsSystemEnabled ? [{ id: 'ads', label: t('tabs.ads') }] : []),
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
        {activeTab === 'game' && <GameSettings />}
        {activeTab === 'controls' && <ControlSettings />}
        {activeTab === 'appearance' && (
          <div className="max-w-2xl">
            <div className="bg-card rounded-md p-6 shadow-sm border border-border">
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-4">
                    {t('appearance.theme')}
                  </h4>
                  <ThemeSelector />
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'ads' && adsSystemEnabled && <AdSettings />}
      </div>
    </div>
  );
}
