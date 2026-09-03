import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageLayout } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { PricingPlans } from './_components/PricingPlans';

// Safe to prerender: pricing tiers are code-defined and i18n-driven, and the
// only per-user state — the "Current Plan" badge and the subscribe / manage
// CTA — is overlaid by the `PricingPlans` client component after hydration.

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
