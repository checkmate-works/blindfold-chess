import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getOptionalUser } from '@/lib/auth';
import { hasActiveSubscription } from '@/lib/billing/subscription';

import { PageLayout } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { PricingCard } from './_components/PricingCard';

export const dynamic = 'force-dynamic'; // Needs auth check for CTA

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pricing' });
  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'pricing', title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pricing' });

  const user = await getOptionalUser();
  const isSubscribed = user ? await hasActiveSubscription(user.id) : false;

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
      <p className="text-muted-foreground">{t('subtitle')}</p>

      <div className="grid gap-6 sm:grid-cols-2 max-w-2xl mx-auto">
        {/* Free Plan */}
        <PricingCard
          variant="free"
          name={t('freePlan.name')}
          price={t('freePlan.price')}
          features={[t('freePlan.feature1')]}
          isCurrent={!isSubscribed}
          currentLabel={t('currentPlan')}
        />

        {/* Ad-Free Plan */}
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
    </PageLayout>
  );
}
