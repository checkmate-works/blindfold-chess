import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { ProseArticle } from '@/app/[locale]/_components/ProseArticle';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'affiliateDisclosure',
    path: 'affiliate-disclosure',
  });
}

export default async function AffiliateDisclosurePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'affiliateDisclosure' });

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
      <ProseArticle className="space-y-4">
        <SectionTitle>{t('amazonDisclosureTitle')}</SectionTitle>
        <p>{t('amazonDisclosureDescription')}</p>
        <p className="text-muted-foreground">{t('lastUpdated')}</p>
      </ProseArticle>
      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
