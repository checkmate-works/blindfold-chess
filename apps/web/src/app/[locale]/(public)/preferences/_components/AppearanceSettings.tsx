'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { BoardAppearanceContent } from './BoardAppearanceContent';
import { BoardPreview } from './BoardPreview';
import { ThemeSelector } from './ThemeSelector';

export function AppearanceSettings() {
  const t = useTranslations('Preferences');
  const { preferences, updatePreferences } = useGamePreferences();

  return (
    <div className="space-y-8">
      {/* Theme Selector */}
      <div>
        <h4 className="text-lg font-semibold text-foreground mb-4">{t('appearance.theme')}</h4>
        <ThemeSelector />
      </div>

      {/* Divider */}
      <div className="border-t border-border"></div>

      {/* Board Appearance */}
      <BoardAppearanceContent settings={preferences} onSettingsChange={updatePreferences} />

      {/* Divider */}
      <div className="border-t border-border"></div>

      {/* Preview */}
      <BoardPreview
        settings={{
          ...preferences,
          showOwnPieces: true,
          showOpponentPieces: true,
          pieceShapeMode: 'normal',
          pieceColors: 'normal',
        }}
      />
    </div>
  );
}
