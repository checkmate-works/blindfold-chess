'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';

import { Modal } from '@/app/[locale]/_components/Modal';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { ControlSettingsContent } from '@/app/[locale]/preferences/_components/ControlSettingsContent';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  translationNamespace: string;
};

export function ControlSettingsModal({ isOpen, onClose, title, translationNamespace }: Props) {
  const t = useTranslations(translationNamespace);
  const { preferences, updatePreferences } = useGamePreferences();

  // Temporary settings state for preview - reset when modal opens using key prop
  const [tempSettings, setTempSettings] = useState(preferences);

  const handleSave = () => {
    updatePreferences(tempSettings);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      title={title}
      onClose={handleCancel}
      maxWidth="max-w-2xl"
      key={isOpen ? 'open' : 'closed'}
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
