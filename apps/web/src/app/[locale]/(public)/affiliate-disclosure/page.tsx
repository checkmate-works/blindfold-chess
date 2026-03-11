import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import {
  Breadcrumb,
  Divider,
  PagePanel,
  PageTitle,
  SectionTitle,
} from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'affiliateDisclosure' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'affiliate-disclosure' }),
    title: t('title'),
    description: t('description'),
  };
}

export default async function AffiliateDisclosurePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'affiliateDisclosure' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel>
        <article className="prose prose-slate dark:prose-invert max-w-none space-y-4">
          <p className="text-muted-foreground">{t('lastUpdated')}</p>

          <SectionTitle>{t('amazonDisclosureTitle')}</SectionTitle>
          <p>{t('amazonDisclosureDescription')}</p>
        </article>

        <Divider />

        <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
