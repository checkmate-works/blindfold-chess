import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';

import { SITE_URL } from '@/config';

import { resolveCspNonce } from '@/lib/security/nonce';
import { JsonLd, generateDefinedTermSetSchema } from '@/lib/seo/jsonld';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
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

  const nonce = await resolveCspNonce();

  return (
    <>
      <JsonLd data={definedTermSetSchema} nonce={nonce} />
      <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
        <div className="space-y-6">
          <SectionTitle>{t('index.alphabetical')}</SectionTitle>
          <AlphabeticalIndex locale={locale} />
        </div>

        <div className="space-y-6">
          <SectionTitle>{t('index.byCategory')}</SectionTitle>
          <CategoryIndex locale={locale} />
        </div>

        <AdSlot slot="content-bottom" />
      </PageLayout>
    </>
  );
}
