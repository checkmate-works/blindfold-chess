'use client';

import { useTranslations } from 'next-intl';

import { Modal } from '@/app/[locale]/_components/Modal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function AboutFeatureInfoModal({ isOpen, onClose }: Props) {
  const t = useTranslations('practice.moveSequence.aboutFeature');

  return (
    <Modal isOpen={isOpen} title={t('title')} onClose={onClose} maxWidth="max-w-lg">
      <div className="space-y-4 text-foreground">
        <p>{t('description1')}</p>
        <p>{t('description2')}</p>
        <p>{t('description3')}</p>
      </div>
    </Modal>
  );
}
