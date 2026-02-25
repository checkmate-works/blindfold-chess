'use client';

import { useTranslations } from 'next-intl';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { PreferenceOption } from './PreferenceOption';

type Props = {
  settings: GamePreferences;
  onSettingsChange: (updates: Partial<GamePreferences>) => void;
};

export function BoardAppearanceContent({ settings, onSettingsChange }: Props) {
  const t = useTranslations('Preferences');

  return (
    <div>
      <h4 className="text-lg font-semibold text-foreground mb-4">{t('game.boardAppearance')}</h4>

      {/* Board Theme */}
      <div className="mb-6">
        <h5 className="text-sm font-medium text-muted-foreground mb-3">{t('game.boardTheme')}</h5>
        <div className="space-y-2">
          {(['lichess', 'chesscom', 'monotone'] as const).map((theme) => (
            <PreferenceOption
              key={theme}
              type="radio"
              name="boardTheme"
              value={theme}
              checked={settings.boardTheme === theme}
              onChange={(e) =>
                onSettingsChange({
                  boardTheme: e.target.value as typeof theme,
                })
              }
              label={t(`game.boardThemes.${theme}`)}
            />
          ))}
        </div>
      </div>

      {/* Board Display Options */}
      <div>
        <h5 className="text-sm font-medium text-muted-foreground mb-3">
          {t('game.displayOptions')}
        </h5>
        <div className="space-y-3">
          <PreferenceOption
            type="checkbox"
            checked={settings.showCoordinates}
            onChange={(e) => onSettingsChange({ showCoordinates: e.target.checked })}
            label={t('game.showCoordinates')}
          />
          <PreferenceOption
            type="checkbox"
            checked={settings.highlightLastMove}
            onChange={(e) => onSettingsChange({ highlightLastMove: e.target.checked })}
            label={t('game.highlightLastMove')}
          />
        </div>
      </div>
    </div>
  );
}
