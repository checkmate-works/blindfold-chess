import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV, SITE_URL } from '@/config';

import { JsonLd, generateDefinedTermSetSchema } from '@/lib/seo/jsonld';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { AlphabeticalIndex } from './_components/AlphabeticalIndex';
import { CategoryIndex } from './_components/CategoryIndex';
import { getGlossaryTerms } from './_lib/queries';

export const generateStaticParams = generateLocaleStaticParams;

export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'metadata.glossary', path: 'glossary' });
}

export default async function GlossaryIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'glossary' });

  const glossaryUrl = `${SITE_URL}/${locale}/glossary`;

  const allTerms = await getGlossaryTerms(locale);
  const definedTerms = allTerms.map((term) => ({
    name: locale === 'ja' && term.termJa ? term.termJa : term.term,
    description: term.definition,
    url: `${glossaryUrl}#${term.term.toLowerCase().replace(/\s+/g, '-')}`,
  }));

  const definedTermSetSchema = generateDefinedTermSetSchema({
    name: t('title'),
    description: t('description'),
    url: glossaryUrl,
    inLanguage: locale,
    terms: definedTerms,
  });

  return (
    <>
      <JsonLd data={definedTermSetSchema} />
      <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
        <div className="space-y-6">
          <SectionTitle>{t('index.alphabetical')}</SectionTitle>
          <AlphabeticalIndex locale={locale} />
        </div>

        <div className="space-y-6">
          <SectionTitle>{t('index.byCategory')}</SectionTitle>
          <CategoryIndex locale={locale} />
        </div>

        {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
        )}
      </PageLayout>
    </>
  );
}
