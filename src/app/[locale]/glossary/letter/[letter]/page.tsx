import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PageTitle } from '../../../_components/PageTitle';
import { Breadcrumb } from '../../../_components/Breadcrumb';
import { GlossaryTermList } from '../../_components/GlossaryTermList';
import { AlphabeticalIndex } from '../../_components/AlphabeticalIndex';
import { chessTerms } from '@/data/chess-terms';

interface GlossaryLetterPageProps {
  params: Promise<{
    locale: string;
    letter: string;
  }>;
}

export async function generateStaticParams() {
  const letters = [...new Set(chessTerms.map((term) => term.term.charAt(0).toLowerCase()))];
  return letters.map((letter) => ({ letter }));
}

export async function generateMetadata({ params }: GlossaryLetterPageProps): Promise<Metadata> {
  const { locale, letter } = await params;
  const t = await getTranslations({ locale, namespace: 'glossary' });
  const upperLetter = letter.toUpperCase();

  return {
    title: `${t('title')} - ${upperLetter}`,
    description: `${t('letterPage.description', { letter: upperLetter })}`,
  };
}

export default async function GlossaryLetterPage({ params }: GlossaryLetterPageProps) {
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
    <>
      <PageTitle>{t('letterPage.title', { letter: upperLetter })}</PageTitle>
      <p className="text-muted-foreground mb-6">
        {t('letterPage.count', { count: filteredTerms.length })}
      </p>

      <div className="mb-8">
        <GlossaryTermList terms={filteredTerms} locale={locale} />
      </div>

      {/* Navigation */}
      <div className="mt-12 pt-8 border-t border-border">
        <AlphabeticalIndex locale={locale} currentLetter={letter.toLowerCase()} />
      </div>

      {/* Breadcrumb at bottom */}
      <div className="mt-8 pt-6 border-t border-border">
        <Breadcrumb items={[{ label: t('title'), href: '/glossary' }, { label: upperLetter }]} />
      </div>
    </>
  );
}
