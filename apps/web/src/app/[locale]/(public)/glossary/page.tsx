import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';

import { SITE_URL } from '@/config';

import { getNativeAdCreatives } from '@/lib/ads/ad';
import { GLOSSARY_TERM_LIST_NATIVE_AD_SLOT } from '@/lib/ads/registry';
import { JsonLd, generateDefinedTermSetSchema } from '@/lib/seo/jsonld';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { NativeAdCard } from '@/app/[locale]/_components/NativeAdCard';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { AlphabeticalIndex } from './_components/AlphabeticalIndex';
import { CategoryIndex } from './_components/CategoryIndex';
import { getGlossaryTerms } from './_lib/queries';

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'metadata.glossary', path: 'glossary' });
}

export default async function GlossaryIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'glossary' });

  const glossaryUrl = `${SITE_URL}/${locale}/glossary`;

  const [allTerms, [nativeAd]] = await Promise.all([
    getGlossaryTerms(locale),
    getNativeAdCreatives(GLOSSARY_TERM_LIST_NATIVE_AD_SLOT, locale),
  ]);
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

        {nativeAd && <NativeAdCard creative={nativeAd} locale={locale} variant="card" />}
      </PageLayout>
    </>
  );
}
