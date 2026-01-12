'use client';

import { useTranslations } from 'next-intl';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

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
            <label className="flex items-center">
              <input
                type="radio"
                name="moveInputMode"
                value="text"
                checked={settings.moveInputMode === 'text'}
                onChange={() => onSettingsChange({ moveInputMode: 'text' })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-muted-foreground">
                {t('controls.textInput')} - {t('controls.textInputDescription')}
              </span>
            </label>

            {/* Auto-complete checkbox - shown only when text input is selected */}
            {settings.moveInputMode === 'text' && (
              <label className="flex items-center ml-6">
                <input
                  type="checkbox"
                  checked={settings.enableAutoComplete}
                  onChange={(e) => onSettingsChange({ enableAutoComplete: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-muted-foreground">
                  {t('controls.enableAutoComplete')}
                </span>
              </label>
            )}

            <label className="flex items-center">
              <input
                type="radio"
                name="moveInputMode"
                value="select"
                checked={settings.moveInputMode === 'select'}
                onChange={() => onSettingsChange({ moveInputMode: 'select' })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-muted-foreground">
                {t('controls.selectInput')} - {t('controls.selectInputDescription')}
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
