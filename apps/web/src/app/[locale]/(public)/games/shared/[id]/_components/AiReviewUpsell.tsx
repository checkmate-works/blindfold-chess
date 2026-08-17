'use client';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaRobot } from 'react-icons/fa';

import type { Locale } from '@/app/[locale]/_lib/types';

type Props = { locale: Locale };

/**
 * What the author of a reviewable game sees in place of the generate button
 * when nothing of theirs pays for the LLM call.
 *
 * Shown to the author only — a viewer who could not generate even after
 * subscribing gets no AI Review tab at all (see `SharedGameDetailView`), so
 * this is never an advert aimed at someone it cannot serve.
 */
export function AiReviewUpsell({ locale }: Props) {
  const t = useTranslations('sharedGames');

  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <FaRobot className="h-5 w-5" />
      </span>
      <h3 className="text-lg font-bold text-foreground">{t('aiReview.upsell.title')}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{t('aiReview.upsell.description')}</p>
      <Link
        href="/pricing"
        locale={locale}
        className="mt-1 w-full max-w-xs rounded-md bg-primary px-4 py-2 text-center font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {t('aiReview.upsell.cta')}
      </Link>
    </div>
  );
}
