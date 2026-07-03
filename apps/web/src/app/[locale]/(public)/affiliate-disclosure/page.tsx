import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
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
      <ProseArticle className="space-y-4" lastUpdated={t('lastUpdated')}>
        <SectionTitle>{t('amazonDisclosureTitle')}</SectionTitle>
        <p>{t('amazonDisclosureDescription')}</p>
      </ProseArticle>
    </PageLayout>
  );
}
