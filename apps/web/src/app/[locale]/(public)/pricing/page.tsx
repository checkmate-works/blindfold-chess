import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageLayout } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { PricingPlans } from './_components/PricingPlans';

// Pricing tiers are code-defined and i18n-driven; the only per-user state is
// the "Current Plan" badge and the subscribe / manage CTA, both of which the
// `PricingPlans` client component overlays after hydration. Long ISR window
// is fine — pricing copy only changes on deploy.
export const revalidate = 3600;

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

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
      <p className="text-muted-foreground">{t('subtitle')}</p>

      <PricingPlans locale={locale} />
    </PageLayout>
  );
}
