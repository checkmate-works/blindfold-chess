'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { GameSettingsContent } from './GameSettingsContent';

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
      <div>
        <GameSettingsContent
          settings={preferences}
          onSettingsChange={updatePreferences}
          showPreview={true}
        />

        {/* Reset Button */}
        <div className="mt-8">
          <Button variant="destructive" onClick={() => setIsResetConfirmOpen(true)}>
            {t('game.resetDefaults')}
          </Button>
        </div>
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
