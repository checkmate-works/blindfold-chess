import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageLayout } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { PricingPlans } from './_components/PricingPlans';

// No `revalidate` of its own: pricing tiers are code-defined and i18n-driven,
// and the only per-user state is the "Current Plan" badge and the subscribe /
// manage CTA, both of which the `PricingPlans` client component overlays after
// hydration. Nothing here changes between deploys, so the page wants the
// layout's interval rather than a shorter one of its own.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'pricing', path: 'pricing' });
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pricing' });

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
      <p className="text-muted-foreground">{t('subtitle')}</p>

      <PricingPlans locale={locale} />
    </PageLayout>
  );
}
