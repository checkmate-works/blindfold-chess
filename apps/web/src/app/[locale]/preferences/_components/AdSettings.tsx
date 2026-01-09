'use client';

import { useTranslations } from 'next-intl';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

export function AdSettings() {
  const t = useTranslations('Preferences');
  const { preferences, updatePreferences } = useGamePreferences();

  return (
    <div className="max-w-2xl">
      <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-2">
              {t('ads.displaySettings')}
            </h4>
            <p className="text-sm text-muted-foreground mb-4">{t('ads.description')}</p>

            <label className="flex items-start">
              <input
                type="checkbox"
                checked={preferences.adsEnabled}
                onChange={(e) => updatePreferences({ adsEnabled: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-0.5"
              />
              <div className="ml-3">
                <span className="text-sm font-medium text-foreground">{t('ads.enableAds')}</span>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('ads.enableAdsDescription')}
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
