'use client';

import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';
import type { Locale } from '@/app/[locale]/_lib/types';

type UseTrainingSessionShellOptions = {
  locale: Locale;
  /**
   * Kebab-case module slug. Drives the end-training redirect target
   * (`/{locale}/practice/{slug}`) and the scroll element id
   * (`{slug}-training-session`).
   */
  slug: string;
  /**
   * Defers the scroll-into-view until the session content is on screen
   * (e.g. `hasQuestions`). Defaults to true (scroll on mount).
   */
  scrollEnabled?: boolean;
};

/**
 * Shared shell logic for the per-module training session components: scrolls
 * the session into view once its content is ready, and provides the
 * "end training" handler (info toast + redirect back to the module top).
 *
 * Per-feature question generation, answering, and rendering stay in each
 * component. Render the returned `sessionElementId` as the id of the
 * component's wrapping element so the scroll target exists.
 */
export function useTrainingSessionShell({
  locale,
  slug,
  scrollEnabled = true,
}: UseTrainingSessionShellOptions) {
  const router = useRouter();
  const { showToast } = useToast();
  const tp = useTranslations('practice');

  const sessionElementId = `${slug}-training-session`;
  useScrollToElement(sessionElementId, scrollEnabled);

  const handleEndTraining = useCallback(() => {
    showToast(tp('trainingEnded'), 'info');
    router.push(`/${locale}/practice/${slug}`);
  }, [showToast, tp, router, locale, slug]);

  return { sessionElementId, handleEndTraining };
}
