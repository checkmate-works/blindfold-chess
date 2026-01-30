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

            <PreferenceOption
              type="radio"
              name="moveInputMode"
              value="button"
              checked={settings.moveInputMode === 'button'}
              onChange={() => onSettingsChange({ moveInputMode: 'button' })}
              label={t('controls.buttonInput')} // Ensure translation key exists or add fallback
              description={t('controls.buttonInputDescription')} // Ensure translation key exists
              descriptionPosition="bottom"
            >
              {settings.moveInputMode === 'button' && (
                <div className="ml-6 p-3">
                  <p className="text-sm font-medium mb-3">{t('controls.buttonLabelStyle')}</p>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="buttonInputPieceLabel"
                        value="icon"
                        checked={settings.buttonInputPieceLabel === 'icon'}
                        onChange={() => onSettingsChange({ buttonInputPieceLabel: 'icon' })}
                        className="rounded-full border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm">{t('controls.icon')}</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="buttonInputPieceLabel"
                        value="text"
                        checked={settings.buttonInputPieceLabel === 'text'}
                        onChange={() => onSettingsChange({ buttonInputPieceLabel: 'text' })}
                        className="rounded-full border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm">{t('controls.text')}</span>
                    </label>
                  </div>
                </div>
              )}
            </PreferenceOption>
          </div>
        </div>
      </div>
    </div>
  );
}
