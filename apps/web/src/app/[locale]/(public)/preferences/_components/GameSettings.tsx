'use client';

import { useState } from 'react';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { CollapsibleGameSettings } from './CollapsibleGameSettings';

export function GameSettings() {
  const t = useTranslations('Preferences');
  const { preferences, updatePreferences, resetPreferences } = useGamePreferences();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleResetConfirm = () => {
    resetPreferences();
    setIsResetConfirmOpen(false);
  };

  return (
    <div className="max-w-4xl">
      {/* Reuse the same board-settings card as the new-game forms so the
          "Game" tab and the game-start screen stay in lockstep (full-width
          visibility picker, peek-mode picker, collapsible visual settings). */}
      <CollapsibleGameSettings settings={preferences} onSettingsChange={updatePreferences} />

      {/* Reset Button */}
      <div className="mt-8 flex justify-end">
        <Button variant="destructive" onClick={() => setIsResetConfirmOpen(true)}>
          {t('game.resetDefaults')}
        </Button>
      </div>

      <ConfirmationModal
        isOpen={isResetConfirmOpen}
        title={t('game.resetDefaultsConfirm.title')}
        message={t('game.resetDefaultsConfirm.message')}
        confirmText={t('game.resetDefaults')}
        cancelText={t('cancel')}
        confirmVariant="danger"
        onConfirm={handleResetConfirm}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
}
