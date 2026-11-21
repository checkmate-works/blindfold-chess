'use client';

import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import {
  realignToElement,
  useScrollToElement,
} from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
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
};

/**
 * Shared shell logic for the per-module training session components: scrolls
 * the session into view before its first paint, re-aligns it on demand
 * (`realignSession`, for modules whose Next button leaves a taller result
 * view), and provides the "end training" handler (info toast + redirect back
 * to the module top).
 *
 * Per-feature question generation, answering, and rendering stay in each
 * component. Render the returned `sessionElementId` as the id of the
 * component's wrapping element — around the loading skeleton too, so the
 * skeleton is already drawn where the session will stay.
 */
export function useTrainingSessionShell({ locale, slug }: UseTrainingSessionShellOptions) {
  const router = useRouter();
  const { showToast } = useToast();
  const tp = useTranslations('practice');

  const sessionElementId = `${slug}-training-session`;
  useScrollToElement(sessionElementId);

  const handleEndTraining = useCallback(() => {
    showToast(tp('trainingEnded'), 'info');
    router.push(`/${locale}/practice/${slug}`);
  }, [showToast, tp, router, locale, slug]);

  const realignSession = useCallback(() => realignToElement(sessionElementId), [sessionElementId]);

  return { sessionElementId, realignSession, handleEndTraining };
}
