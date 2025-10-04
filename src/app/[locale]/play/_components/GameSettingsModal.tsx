'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import type { Side } from '@/lib/types';

import { Modal } from '@/app/[locale]/_components/Modal';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { GameSettingsContent } from '@/app/[locale]/preferences/_components/GameSettingsContent';

interface GameSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerSide?: Side;
}

export function GameSettingsModal({
  isOpen,
  onClose,
  playerSide = 'white',
}: GameSettingsModalProps) {
  const t = useTranslations('play');
  const { preferences, updatePreferences } = useGamePreferences();

  // Temporary settings state for preview
  const [tempSettings, setTempSettings] = useState(preferences);

  // Reset temp settings when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempSettings(preferences);
    }
  }, [isOpen, preferences]);

  const handleSave = () => {
    updatePreferences(tempSettings);
    onClose();
  };

  const handleCancel = () => {
    setTempSettings(preferences);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      title={t('configureBoardAppearance')}
      onClose={handleCancel}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-8">
        <GameSettingsContent
          settings={tempSettings}
          onSettingsChange={(updates) => setTempSettings({ ...tempSettings, ...updates })}
          playerSide={playerSide}
          showPreview={true}
          compact={true}
        />

        {/* Modal Actions */}
        <div className="flex justify-center pt-4 border-t border-border space-x-4">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-background bg-foreground rounded-md hover:bg-foreground/90"
          >
            {t('save')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
