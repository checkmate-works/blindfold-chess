import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV, SITE_URL } from '@/config';

import { JsonLd, generateDefinedTermSetSchema } from '@/lib/seo/jsonld';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { AlphabeticalIndex } from './_components/AlphabeticalIndex';
import { CategoryIndex } from './_components/CategoryIndex';
import { getGlossaryTerms } from './_lib/queries';

export const generateStaticParams = generateLocaleStaticParams;

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'metadata.glossary' });

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'glossary', title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function GlossaryIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'glossary' });

  const glossaryUrl = `${SITE_URL}/${locale}/glossary`;
  const LANGUAGE_MAP: Record<string, string> = { en: 'en-US', ja: 'ja-JP', es: 'es-ES' };
  const inLanguage = LANGUAGE_MAP[locale] ?? 'en-US';

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
    inLanguage,
    terms: definedTerms,
  });

  return (
    <div className="space-y-8">
      <JsonLd data={definedTermSetSchema} />
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel>
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

        <Divider />

        <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
