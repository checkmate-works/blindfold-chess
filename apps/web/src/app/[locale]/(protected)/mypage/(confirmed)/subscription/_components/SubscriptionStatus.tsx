'use client';

import { useTranslations } from 'next-intl';

import type { Subscription } from '@/lib/db';
import { BENEFIT_ACTIVE_STATUSES } from '@/lib/subscription';

import { createPortalSession } from '../_actions/createPortalSession';

type Props = {
  subscription: Subscription | null;
  locale: string;
};

export function SubscriptionStatus({ subscription, locale }: Props) {
  const t = useTranslations('subscription');

  async function handleManage() {
    const result = await createPortalSession(locale);
    if (result && 'error' in result) {
      console.error('Portal error:', result.error);
    }
    // If successful, redirect happens via Server Action
  }

  if (!subscription) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold">{t('noSubscription')}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t('noSubscriptionDescription')}</p>
        <a
          href={`/${locale}/pricing`}
          className="mt-4 inline-block rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {t('viewPlans')}
        </a>
      </div>
    );
  }

  const isActive = BENEFIT_ACTIVE_STATUSES.includes(
    subscription.status as (typeof BENEFIT_ACTIVE_STATUSES)[number]
  );
  const isCanceling = subscription.cancelAtPeriodEnd;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t('adFreePlan')}</h3>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            isActive
              ? isCanceling
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
          }`}
        >
          {isCanceling ? t('statusCanceling') : isActive ? t('statusActive') : t('statusInactive')}
        </span>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        {isCanceling && (
          <div>
            <dt className="text-muted-foreground">{t('cancelingNote')}</dt>
            <dd className="font-medium text-yellow-700 dark:text-yellow-300">
              {t('accessUntil', {
                date: new Date(subscription.currentPeriodEnd).toLocaleDateString(locale),
              })}
            </dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t('nextBilling')}</dt>
          <dd>
            {isCanceling
              ? t('noBilling')
              : new Date(subscription.currentPeriodEnd).toLocaleDateString(locale)}
          </dd>
        </div>
      </dl>

      <button
        onClick={handleManage}
        className="mt-6 w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
        {t('manageSubscription')}
      </button>
    </div>
  );
}
