'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { FaPlay } from 'react-icons/fa';

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

  const handleStart = () => {
    router.push(
      `/${locale}/practice/board-symmetry/session?timeLimit=${timeLimit}#board-symmetry-session`
    );
  };

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

        <Button
          onClick={handleStart}
          variant="primary"
          size="lg"
          icon={<FaPlay />}
          className="w-full"
        >
          {tSettings('start')}
        </Button>

        <div className="mt-4 text-center">
          <Link
            href="/practice/board-symmetry/tutorial"
            locale={locale}
            className="text-sm text-muted-foreground underline hover:text-foreground transition-colors"
          >
            {t('viewTutorial')}
          </Link>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button variant="destructive" onClick={() => setIsResetConfirmOpen(true)}>
          {t('resetSettings')}
        </Button>
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
