'use client';

import { useEffect, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { useAuth } from '@/app/[locale]/_contexts/AuthContext';
import { INTERVIEW_QUESTION_KEYS } from '@/app/[locale]/_lib/interview';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getCurrentUserAnsweredKeys } from '../_actions/getCurrentUserAnsweredKeys';
import { InterviewQuestionCard } from './InterviewQuestionCard';

type Props = {
  locale: Locale;
};

/**
 * Client-rendered interview-question grid.
 *
 * Lives in a client component so the parent interview page can stay free
 * of cookie-reading server APIs (`auth.getUser()` / `getInterviewAnswers`)
 * and be served from the ISR cache. The initial SSR/ISR render uses the
 * unauthenticated view (no "answered" badges); after hydration we fetch
 * the current user's answered keys via a Server Action and re-render.
 * Crawlers and anonymous visitors see the cached HTML directly.
 */
export function InterviewQuestionGrid({ locale }: Props) {
  const t = useTranslations('interview');
  const { user, isLoading: authLoading } = useAuth();
  const [answeredKeys, setAnsweredKeys] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setAnsweredKeys(new Set());
      return;
    }
    let cancelled = false;
    getCurrentUserAnsweredKeys()
      .then(({ answeredKeys }) => {
        if (!cancelled) setAnsweredKeys(new Set(answeredKeys));
      })
      .catch(() => {
        // Answered-badge overlay is non-load-bearing: failures leave the
        // unauthenticated grid in place, matching the crawler view.
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {INTERVIEW_QUESTION_KEYS.map((key) => (
        <InterviewQuestionCard
          key={key}
          questionKey={key}
          label={t(`questions.${key}.label` as never)}
          description={t(`questions.${key}.description` as never)}
          isAuthenticated={!!user}
          isAnswered={answeredKeys.has(key)}
          answeredLabel={t('answered')}
          notAnsweredLabel={t('noAnswer')}
          locale={locale}
        />
      ))}
    </div>
  );
}
