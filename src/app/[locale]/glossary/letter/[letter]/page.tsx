import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import {
  PageTitle,
  PageDescription,
  Breadcrumb,
  Divider,
  SectionTitle,
} from '../../../_components';
import { GlossaryTermList } from '../../_components/GlossaryTermList';
import { AlphabeticalIndex } from '../../_components/AlphabeticalIndex';
import { chessTerms } from '../../_data/chess-terms';
import type { Locale } from '../../../_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
    letter: string;
  }>;
};

export async function generateStaticParams() {
  const letters = [...new Set(chessTerms.map((term) => term.term.charAt(0).toLowerCase()))];
  return letters.map((letter) => ({ letter }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, letter } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.glossary.letter' });
  const upperLetter = letter.toUpperCase();

  return {
    title: t('title', { letter: upperLetter }),
    description: t('description', { letter: upperLetter }),
  };
}

export default async function GlossaryLetterPage({ params }: Props) {
  const { locale, letter } = await params;
  const t = await getTranslations({ locale, namespace: 'glossary' });
  const upperLetter = letter.toUpperCase();

  // Filter terms by letter
  const filteredTerms = chessTerms.filter(
    (term) => term.term.charAt(0).toUpperCase() === upperLetter
  );

  if (filteredTerms.length === 0) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageTitle>{t('letterPage.title', { letter: upperLetter })}</PageTitle>

      <PageDescription>{t('letterPage.count', { count: filteredTerms.length })}</PageDescription>

      <SectionTitle>{t('letterPage.termsTitle')}</SectionTitle>

      <GlossaryTermList terms={filteredTerms} locale={locale} />

      <Divider />

      <SectionTitle>{t('alphabeticalIndexTitle')}</SectionTitle>

      <AlphabeticalIndex locale={locale} currentLetter={letter.toLowerCase()} />

      <Divider />

      <Breadcrumb
        items={[{ label: t('title'), href: '/glossary' }, { label: upperLetter }]}
        locale={locale}
      />
    </div>
  );
}
