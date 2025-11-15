'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';

import { Modal } from '@/app/[locale]/_components/Modal';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { ControlSettingsContent } from '@/app/[locale]/preferences/_components/ControlSettingsContent';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function ControlSettingsModal({ isOpen, onClose }: Props) {
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
      title={t('configureInputMethod')}
      onClose={handleCancel}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-8">
        <ControlSettingsContent
          settings={tempSettings}
          onSettingsChange={(updates) => setTempSettings({ ...tempSettings, ...updates })}
          compact={true}
        />

        {/* Modal Actions */}
        <div className="flex justify-center pt-4 border-t border-border space-x-4">
          <Button variant="secondary" onClick={handleCancel}>
            {t('cancel')}
          </Button>
          <Button variant="primary" onClick={handleSave}>
            {t('save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
