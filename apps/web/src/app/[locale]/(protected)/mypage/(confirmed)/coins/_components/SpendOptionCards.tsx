import type { ReactNode } from 'react';

import { getTranslations } from 'next-intl/server';
import Image from 'next/image';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { FaRobot } from 'react-icons/fa';

import { AI_REVIEW_POINT_COST, MAIA_GAME_POINT_COST } from '@/lib/points';

import type { Locale } from '@/app/[locale]/_lib/types';

function SpendOptionCard({
  icon,
  title,
  rate,
  note,
  cta,
  href,
  locale,
}: {
  icon: ReactNode;
  title: string;
  rate: string;
  note: string;
  cta: string;
  href: string;
  locale: Locale;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-foreground"
        >
          {icon}
        </div>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      </div>
      <p className="text-sm font-medium text-foreground">{rate}</p>
      <p className="text-xs text-muted-foreground">{note}</p>
      <div className="mt-auto pt-1">
        <Link href={href} locale={locale}>
          <Button asChild variant="outline" fullWidth>
            {cta}
          </Button>
        </Link>
      </div>
    </div>
  );
}

type Props = {
  locale: Locale;
  /**
   * Whether an active subscription pays for this user's AI reviews. Swaps the
   * AI review note only — Maia games have no exemption for anyone, and a dan
   * belt deliberately does not cover reviews either (ads cost the user
   * attention; a review costs the operator an LLM call — see the "Coins, not
   * the ad-free set" note on `resolveAiReviewGenerationState`). This is why
   * the page passes subscription status here and not the broader ad-free
   * block it computes for the redeem card.
   */
  hasSubscription: boolean;
};

/**
 * The two coin spends that cannot happen on this page: a Maia game is paid
 * when the game is created, an AI review when the author requests it on their
 * shared game's page. Unlike the ad_free exchange above, there is nothing to
 * submit here — each card states the rate and links to the venue where the
 * spend actually happens, so the balance's uses are all visible in one place
 * without duplicating either flow.
 *
 * The links stay enabled at any balance: following one never spends a coin,
 * and the venues carry their own affordability handling (the game launch
 * modal prices the Maia option; the review panel swaps its generate button
 * for an upsell).
 */
export async function SpendOptionsSection({ locale, hasSubscription }: Props) {
  const t = await getTranslations({ locale, namespace: 'MypagePoints' });

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-2">{t('spendOptions.title')}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <SpendOptionCard
          icon={
            <Image
              src="/images/engines/maia.png"
              alt=""
              width={28}
              height={28}
              className="object-contain"
            />
          }
          title={t('spendOptions.maia.title')}
          rate={t('spendOptions.maia.rate', { cost: MAIA_GAME_POINT_COST })}
          note={t('spendOptions.maia.note')}
          cta={t('spendOptions.maia.cta')}
          href="/games/new"
          locale={locale}
        />
        <SpendOptionCard
          icon={<FaRobot className="h-5 w-5" />}
          title={t('spendOptions.aiReview.title')}
          rate={t('spendOptions.aiReview.rate', { cost: AI_REVIEW_POINT_COST })}
          note={
            hasSubscription
              ? t('spendOptions.aiReview.noteSubscriber')
              : t('spendOptions.aiReview.note')
          }
          cta={t('spendOptions.aiReview.cta')}
          href="/games"
          locale={locale}
        />
      </div>
    </div>
  );
}
