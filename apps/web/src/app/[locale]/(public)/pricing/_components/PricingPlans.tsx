'use client';

import { useEffect, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { useAuth } from '@/app/[locale]/_contexts/AuthContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getCurrentUserSubscriptionStatus } from '../_actions/getCurrentUserSubscriptionStatus';
import { PricingCard } from './PricingCard';

type Props = {
  locale: Locale;
};

/**
 * Client-rendered pricing plan grid.
 *
 * Lives in a client component so the parent pricing page can stay free of
 * cookie-reading server APIs (`auth.getUser()` / `hasActiveSubscription`)
 * and be served from the ISR cache. The initial SSR/ISR render uses the
 * unauthenticated, unsubscribed view; after hydration we fetch the current
 * user's subscription status via a Server Action and re-render. Crawlers
 * and anonymous visitors see the cached HTML directly. Signed-in users see
 * the unauthenticated state for a hydration tick before their personal
 * state replaces it.
 */
export function PricingPlans({ locale }: Props) {
  const t = useTranslations('pricing');
  const { user, isLoading: authLoading } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsSubscribed(false);
      return;
    }
    let cancelled = false;
    getCurrentUserSubscriptionStatus()
      .then(({ isSubscribed }) => {
        if (!cancelled) setIsSubscribed(isSubscribed);
      })
      .catch(() => {
        // Subscription overlay is non-load-bearing: failures leave the
        // unauthenticated cards in place, matching the crawler view.
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return (
    <div className="grid gap-6 sm:grid-cols-2 max-w-2xl mx-auto">
      <PricingCard
        variant="free"
        name={t('freePlan.name')}
        price={t('freePlan.price')}
        features={[t('freePlan.feature1')]}
        isCurrent={!isSubscribed}
        currentLabel={t('currentPlan')}
      />

      <PricingCard
        variant="paid"
        name={t('adFreePlan.name')}
        price={t('adFreePlan.price')}
        priceUnit={t('adFreePlan.priceUnit')}
        features={[t('adFreePlan.feature1'), t('adFreePlan.feature2')]}
        isCurrent={isSubscribed}
        currentLabel={t('currentPlan')}
        ctaLabel={isSubscribed ? t('managePlan') : t('subscribe')}
        ctaHref={isSubscribed ? `/${locale}/mypage/subscription` : undefined}
        locale={locale}
        isAuthenticated={!!user}
      />
    </div>
  );
}
