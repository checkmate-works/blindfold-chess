'use client';

import { useState } from 'react';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { CollapsibleGameSettings } from './CollapsibleGameSettings';
import { ControlSettingsContent } from './ControlSettingsContent';

/**
 * The "Game" tab: everything about playing a game on this device — what the
 * board reveals, and how moves are entered.
 *
 * Move input used to be its own "Controls" tab. It was folded in here once
 * that tab had shrunk to a single section (the board-peek picker it also held
 * had already moved next to the board-visibility picker below), and because
 * the reset button at the bottom restores DEFAULT_PREFERENCES — move-input
 * settings included — which read as a cross-tab side effect while the two
 * were separate.
 *
 * `ControlSettingsContent` is composed HERE rather than inside
 * `CollapsibleGameSettings`: that block is shared with the new-game forms and
 * the mid-game modal, where move input is not an option being chosen.
 */
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

      <div className="my-8 border-t border-border" />

      <ControlSettingsContent settings={preferences} onSettingsChange={updatePreferences} />

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
