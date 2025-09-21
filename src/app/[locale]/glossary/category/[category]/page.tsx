import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PageTitle } from '../../../_components/PageTitle';
import { Breadcrumb } from '../../../_components/Breadcrumb';
import { GlossaryTermList } from '../../_components/GlossaryTermList';
import { CategoryIndex } from '../../_components/CategoryIndex';
import { chessTerms } from '../../_data/chess-terms';

interface GlossaryCategoryPageProps {
  params: Promise<{
    locale: string;
    category: string;
  }>;
}

const validCategories = [
  'tactics',
  'strategy',
  'endgame',
  'opening',
  'structure',
  'general',
] as const;

export async function generateStaticParams() {
  return validCategories.map((category) => ({ category }));
}

export async function generateMetadata({ params }: GlossaryCategoryPageProps): Promise<Metadata> {
  const { locale, category } = await params;
  const t = await getTranslations({ locale, namespace: 'glossary' });

  return {
    title: `${t('title')} - ${t(`categories.${category}`)}`,
    description: t('categoryPage.description', { category: t(`categories.${category}`) }),
  };
}

const categoryStyles = {
  tactics: { color: 'bg-destructive/10 text-destructive', icon: '⚔️' },
  strategy: { color: 'bg-primary/10 text-primary', icon: '🎯' },
  endgame: { color: 'bg-secondary/10 text-secondary-foreground', icon: '♔' },
  opening: { color: 'bg-muted/50 text-muted-foreground', icon: '📖' },
  structure: { color: 'bg-accent/50 text-accent-foreground', icon: '♟' },
  general: { color: 'bg-card text-card-foreground', icon: '📋' },
};

export default async function GlossaryCategoryPage({ params }: GlossaryCategoryPageProps) {
  const { locale, category } = await params;
  const t = await getTranslations({ locale, namespace: 'glossary' });

  // Validate category
  if (!validCategories.includes(category as (typeof validCategories)[number])) {
    notFound();
  }

  // Filter terms by category
  const filteredTerms = chessTerms.filter((term) => term.category === category);

  const categoryStyle = categoryStyles[category as keyof typeof categoryStyles];

  return (
    <>
      <div className="flex items-start gap-4 mb-8">
        <span className="text-4xl">{categoryStyle.icon}</span>
        <div>
          <PageTitle>{t(`categories.${category}`)}</PageTitle>
          <p className="text-muted-foreground">
            {t('categoryPage.count', { count: filteredTerms.length })}
          </p>
        </div>
      </div>

      <div className="mb-8">
        <GlossaryTermList terms={filteredTerms} locale={locale} />
      </div>

      {/* Navigation */}
      <div className="mt-12 pt-8 border-t border-border">
        <CategoryIndex locale={locale} currentCategory={category} />
      </div>

      {/* Breadcrumb at bottom */}
      <div className="mt-8 pt-6 border-t border-border">
        <Breadcrumb
          items={[{ label: t('title'), href: '/glossary' }, { label: t(`categories.${category}`) }]}
          locale={locale}
        />
      </div>
    </>
  );
}
