'use client';

import { useTranslations } from 'next-intl';
import { useGamePreferences } from '../../_contexts/GamePreferencesContext';
import { GameSettingsContent } from './GameSettingsContent';

export function GameSettings() {
  const t = useTranslations('Preferences');
  const { preferences, updatePreferences, resetPreferences } = useGamePreferences();

  return (
    <div className="max-w-4xl">
      <div>
        <GameSettingsContent
          settings={preferences}
          onSettingsChange={updatePreferences}
          showPreview={true}
        />

        {/* Reset Button */}
        <div className="mt-8">
          <button
            onClick={resetPreferences}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-md transition-colors"
          >
            {t('game.resetDefaults')}
          </button>
        </div>
      </div>
    </div>
  );
}
