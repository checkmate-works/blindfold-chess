'use client';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { CoinIcon } from '@blindfold-chess/icons';

import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  /** Coins one review costs. */
  cost: number;
};

/**
 * What the author of a reviewable game sees in place of the generate button
 * when nothing of theirs pays for the LLM call: what a review is, the coin
 * price, and the two ways to close the gap — earn coins (likes on their
 * published work) or subscribe.
 *
 * Deliberately does NOT state their balance: reaching this branch means the
 * balance is below the one-coin price, i.e. always zero, so the figure adds a
 * sentence and no information. How to earn and what a subscription changes
 * are the two links below, which is why the copy no longer says either.
 *
 * Shown to the author only — a viewer who could not generate even after
 * paying gets no AI Review tab at all (see `SharedGameDetailView`), so this
 * is never an advert aimed at someone it cannot serve.
 */
export function AiReviewUpsell({ locale, cost }: Props) {
  const t = useTranslations('sharedGames');

  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <CoinIcon size={24} aria-hidden="true" />
      </span>
      <h3 className="text-lg font-bold text-foreground">{t('aiReview.upsell.title', { cost })}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{t('aiReview.upsell.description')}</p>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Link
          href="/coin"
          locale={locale}
          className="w-full rounded-md bg-primary px-4 py-2 text-center font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t('aiReview.upsell.coinCta')}
        </Link>
        <Link
          href="/pricing"
          locale={locale}
          className="w-full rounded-md border border-border px-4 py-2 text-center font-medium text-foreground transition-colors hover:bg-foreground/5"
        >
          {t('aiReview.upsell.cta')}
        </Link>
      </div>
    </div>
  );
}
