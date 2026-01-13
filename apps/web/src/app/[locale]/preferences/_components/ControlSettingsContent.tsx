'use client';

import { useTranslations } from 'next-intl';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { PreferenceOption } from './PreferenceOption';

type Props = {
  settings: GamePreferences;
  onSettingsChange: (updates: Partial<GamePreferences>) => void;
  compact?: boolean;
};

export function ControlSettingsContent({ settings, onSettingsChange, compact = false }: Props) {
  const t = useTranslations('Preferences');

  const containerClass = compact ? '' : 'bg-card rounded-md p-6 shadow-sm border border-border';

  return (
    <div className={containerClass}>
      <div className="space-y-4">
        <div>
          <h4 className="text-lg font-semibold text-foreground mb-4">{t('controls.moveInput')}</h4>
          <div className="space-y-2">
            <PreferenceOption
              type="radio"
              name="moveInputMode"
              value="text"
              checked={settings.moveInputMode === 'text'}
              onChange={() => onSettingsChange({ moveInputMode: 'text' })}
              label={t('controls.textInput')}
              description={t('controls.textInputDescription')}
              descriptionPosition="bottom"
            >
              {settings.moveInputMode === 'text' && (
                <PreferenceOption
                  type="checkbox"
                  checked={settings.enableAutoComplete}
                  onChange={(e) => onSettingsChange({ enableAutoComplete: e.target.checked })}
                  label={t('controls.enableAutoComplete')}
                  variant="plain"
                  className="ml-6"
                />
              )}
            </PreferenceOption>

            <PreferenceOption
              type="radio"
              name="moveInputMode"
              value="select"
              checked={settings.moveInputMode === 'select'}
              onChange={() => onSettingsChange({ moveInputMode: 'select' })}
              label={t('controls.selectInput')}
              description={t('controls.selectInputDescription')}
              descriptionPosition="bottom"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
