'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { FaInfoCircle } from 'react-icons/fa';

import { SectionTitle } from '@/app/[locale]/_components';

import { AboutFeatureInfoModal } from './AboutFeatureInfoModal';

export function TutorialSectionTitle() {
  const t = useTranslations('practice.moveSequence.tutorial');
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  return (
    <>
      <SectionTitle>
        <span className="inline-flex items-center gap-2">
          {t('title')}
          <button
            type="button"
            onClick={() => setIsInfoModalOpen(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Show feature information"
          >
            <FaInfoCircle className="w-4 h-4" />
          </button>
        </span>
      </SectionTitle>

      <AboutFeatureInfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
    </>
  );
}
