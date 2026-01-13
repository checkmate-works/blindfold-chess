'use client';

import { useTranslations } from 'next-intl';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { PreferenceOption } from './PreferenceOption';

export function AdSettings() {
  const t = useTranslations('Preferences');
  const { preferences, updatePreferences } = useGamePreferences();

  return (
    <div className="max-w-2xl">
      <div className="bg-card rounded-md p-6 shadow-sm border border-border">
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-2">
              {t('ads.displaySettings')}
            </h4>
            <p className="text-sm text-muted-foreground mb-4">{t('ads.description')}</p>

            <PreferenceOption
              type="checkbox"
              checked={preferences.adsEnabled}
              onChange={(e) => updatePreferences({ adsEnabled: e.target.checked })}
              label={t('ads.enableAds')}
              description={t('ads.enableAdsDescription')}
              descriptionPosition="bottom"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
