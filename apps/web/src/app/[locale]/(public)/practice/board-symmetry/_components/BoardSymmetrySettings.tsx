'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaArrowRight, FaPlay } from 'react-icons/fa';

import { TimeSlider } from '@/app/[locale]/(public)/practice/_components/TimeSlider';
import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import type { Locale } from '@/app/[locale]/_lib/types';

import { BOARD_SYMMETRY_TUTORIAL_SKIPPED_KEY } from './BoardSymmetryTutorialSkipLink';

type Props = {
  locale: Locale;
};

const STORAGE_KEY = 'boardSymmetrySettings';
const DEFAULT_TIME_LIMIT = 60;

export default function BoardSymmetrySettings({ locale }: Props) {
  const t = useTranslations('practice.boardSymmetry');
  const tSettings = useTranslations('practice.settings');

  const router = useRouter();

  // Settings state
  const [timeLimit, setTimeLimit] = useState(DEFAULT_TIME_LIMIT);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.timeLimit) {
          setTimeLimit(settings.timeLimit);
        }
      } catch {
        // ignore error
      }
    }
    setHasLoaded(true);
  }, []);

  // Save settings on change
  useEffect(() => {
    if (!hasLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ timeLimit }));
  }, [timeLimit, hasLoaded]);

  const handleResetConfirm = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BOARD_SYMMETRY_TUTORIAL_SKIPPED_KEY);
    setIsResetConfirmOpen(false);

    // Reset state to defaults
    setTimeLimit(DEFAULT_TIME_LIMIT);

    // Redirect to tutorial
    router.push(`/${locale}/practice/board-symmetry/tutorial`);
  };

  if (!hasLoaded) {
    return null; // or skeleton
  }

  return (
    <div>
      <div className="mb-8">
        <SectionTitle className="mb-4">{t('howToPlayTitle')}</SectionTitle>
        <div className="mb-2 rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">{t('howToPlayDescription')}</p>
          <div className="flex items-center justify-center gap-3 text-foreground">
            <span className="text-lg font-bold">e4</span>
            <FaArrowRight className="text-muted-foreground" />
            <span className="text-lg font-bold">?</span>
          </div>
        </div>
        <div className="mb-6 text-center">
          <Link
            href={`/${locale}/practice/board-symmetry/tutorial`}
            className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
          >
            {t('viewTutorial')}
          </Link>
        </div>

        <SectionTitle className="mb-4">{tSettings('title')}</SectionTitle>

        <div className="mb-6">
          <TimeSlider
            timeLimit={timeLimit}
            onTimeLimitChange={setTimeLimit}
            labels={{
              timeLimit: tSettings('timeLimit'),
              seconds: tSettings('seconds'),
            }}
          />
        </div>

        <Link
          href={`/${locale}/practice/board-symmetry/session?timeLimit=${timeLimit}#board-symmetry-session`}
        >
          <Button asChild variant="primary" size="lg" icon={<FaPlay />} className="w-full">
            {tSettings('start')}
          </Button>
        </Link>
      </div>

      <div className="mt-8 space-y-3">
        <SectionTitle>{t('requiredKnowledge')}</SectionTitle>
        <CardLink
          href="/learn/coordinates/board-symmetry"
          icon="🦋"
          title={t('viewArticle')}
          description={t('articleDescription')}
          locale={locale}
        />
      </div>

      <div className="mt-8 flex justify-end">
        <Button variant="destructive" onClick={() => setIsResetConfirmOpen(true)}>
          {t('resetSettings')}
        </Button>
      </div>

      <ConfirmationModal
        isOpen={isResetConfirmOpen}
        title={t('resetSettingsConfirm.title')}
        message={t('resetSettingsConfirm.message')}
        confirmText={t('resetSettings')}
        cancelText={t('cancel')}
        confirmVariant="danger"
        onConfirm={handleResetConfirm}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
}
