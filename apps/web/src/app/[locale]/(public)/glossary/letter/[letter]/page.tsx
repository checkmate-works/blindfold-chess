import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SUPPORTED_LOCALES } from '@/config';

import {
  Breadcrumb,
  Divider,
  PageDescription,
  PagePanel,
  PageTitle,
  SectionTitle,
} from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { AlphabeticalIndex } from '../../_components/AlphabeticalIndex';
import { GlossaryTermList } from '../../_components/GlossaryTermList';
import { getTermsByLetter } from '../../_lib/queries';

type Props = {
  params: Promise<{
    locale: Locale;
    letter: string;
  }>;
};

// Queries the database at build time — requires a running DB connection for `next build`.
export async function generateStaticParams() {
  const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
  return letters.flatMap((letter) =>
    SUPPORTED_LOCALES.map((locale) => ({
      locale,
      letter: letter.toLowerCase(),
    }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, letter } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.glossary.letter' });
  const upperLetter = letter.toUpperCase();

  return {
    ...generateCanonicalMetadata({ locale, path: `glossary/letter/${letter}` }),
    title: t('title', { letter: upperLetter }),
    description: t('description', { letter: upperLetter }),
  };
}

export default async function GlossaryLetterPage({ params }: Props) {
  const { locale, letter } = await params;
  const t = await getTranslations({ locale, namespace: 'glossary' });
  const upperLetter = letter.toUpperCase();

  const filteredTerms = await getTermsByLetter(letter, locale);

  return (
    <div className="space-y-8">
      <PageTitle>{t('letterPage.title', { letter: upperLetter })}</PageTitle>

      <PageDescription>{t('letterPage.count', { count: filteredTerms.length })}</PageDescription>

      <PagePanel>
        <SectionTitle>{t('letterPage.termsTitle')}</SectionTitle>

        <GlossaryTermList terms={filteredTerms} locale={locale} />

        <SectionTitle>{t('alphabeticalIndexTitle')}</SectionTitle>

        <AlphabeticalIndex locale={locale} currentLetter={letter.toLowerCase()} />

        <Divider />

        <Breadcrumb
          items={[{ label: t('title'), href: '/glossary' }, { label: upperLetter }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
