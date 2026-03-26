import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getOptionalUser } from '@/lib/auth';
import { hasActiveSubscription } from '@/lib/subscription';

import { PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PricingCard } from './_components/PricingCard';

export const dynamic = 'force-dynamic'; // Needs auth check for CTA

type Props = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pricing' });
  return {
    ...generateCanonicalMetadata({ locale, path: 'pricing' }),
    title: t('title'),
    description: t('description'),
  };
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pricing' });

  const user = await getOptionalUser();
  const isSubscribed = user ? await hasActiveSubscription(user.id) : false;

  return (
    <>
      <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
      <PageTitle>{t('title')}</PageTitle>
      <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 max-w-2xl mx-auto">
        {/* Free Plan */}
        <PricingCard
          variant="free"
          name={t('freePlan.name')}
          price={t('freePlan.price')}
          features={[t('freePlan.feature1'), t('freePlan.feature2'), t('freePlan.feature3')]}
          isCurrent={!isSubscribed}
          currentLabel={t('currentPlan')}
        />

        {/* Ad-Free Plan */}
        <PricingCard
          variant="paid"
          name={t('adFreePlan.name')}
          price={t('adFreePlan.price')}
          priceUnit={t('adFreePlan.priceUnit')}
          features={[t('adFreePlan.feature1'), t('adFreePlan.feature2'), t('adFreePlan.feature3')]}
          isCurrent={isSubscribed}
          currentLabel={t('currentPlan')}
          ctaLabel={isSubscribed ? t('managePlan') : t('subscribe')}
          ctaHref={isSubscribed ? `/${locale}/mypage/subscription` : undefined}
          locale={locale}
          isAuthenticated={!!user}
        />
      </div>
    </>
  );
}
