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
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-foreground"
        >
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-sm font-medium text-foreground">{rate}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{note}</p>
      <Link href={href} locale={locale} className="block">
        <Button asChild variant="outline" fullWidth>
          {cta}
        </Button>
      </Link>
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
  /**
   * The viewer's profile username, for the link to their shared games —
   * that profile tab is where the games whose pages offer an AI review
   * live. `null` only when the viewer has no profile row yet, a state the
   * `(confirmed)` layout already redirects away from; kept total anyway,
   * falling back to the local games list rather than asserting.
   */
  username: string | null;
};

/**
 * The two coin spends that cannot happen on this page: an AI review is paid
 * when the author requests it on their shared game's page, a Maia game when
 * the game is created. There is nothing to submit here — each card states
 * the rate and links to the venue where the spend actually happens, so the
 * balance's uses are all visible in one place without duplicating either
 * flow. Rendered as a fragment: the cards are siblings of the redeem card
 * in the page's one spacing column, same width, no grouping heading.
 *
 * The links stay enabled at any balance: following one never spends a coin,
 * and the venues carry their own affordability handling (the review panel
 * swaps its generate button for an upsell; the engine selector locks the
 * Maia card). The Maia link lands on the standard form with Maia already
 * chosen via `?engine=maia` — see `initialEngineKind`.
 */
export async function SpendOptionCards({ locale, hasSubscription, username }: Props) {
  const t = await getTranslations({ locale, namespace: 'MypagePoints' });

  return (
    <>
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
        href={username ? `/u/${username}/games` : '/games'}
        locale={locale}
      />
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
        href="/games/new/standard?engine=maia"
        locale={locale}
      />
    </>
  );
}
