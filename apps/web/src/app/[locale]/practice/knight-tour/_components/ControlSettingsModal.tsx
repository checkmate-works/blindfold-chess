'use client';

import { useTranslations } from 'next-intl';

import { ControlSettingsModal as SharedControlSettingsModal } from '@/app/[locale]/_components/ControlSettingsModal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function ControlSettingsModal({ isOpen, onClose }: Props) {
  const t = useTranslations('practice.knightTour');

  return (
    <SharedControlSettingsModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('inputSettings')}
      translationNamespace="practice.knightTour"
    />
  );
}
