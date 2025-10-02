import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PageTitle, Breadcrumb, Divider, SectionTitle } from '../../../_components';
import { GlossaryTermList } from '../../_components/GlossaryTermList';
import { CategoryIndex } from '../../_components/CategoryIndex';
import { chessTerms } from '../../_data/chess-terms';
import type { Locale } from '../../../_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
    category: string;
  }>;
};

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.glossary.category' });

  // Get localized category name
  const categoryT = await getTranslations({ locale, namespace: 'glossary.categories' });
  const categoryName = categoryT(category);

  return {
    title: t('title', { category: categoryName }),
    description: t('description', { category: categoryName }),
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

export default async function GlossaryCategoryPage({ params }: Props) {
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
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <span className="text-4xl">{categoryStyle.icon}</span>
        <div>
          <PageTitle>{t(`categories.${category}`)}</PageTitle>
          <p className="text-muted-foreground">
            {t('categoryPage.count', { count: filteredTerms.length })}
          </p>
        </div>
      </div>

      <Divider />

      <SectionTitle>{t('categoryPage.termsTitle')}</SectionTitle>

      <GlossaryTermList terms={filteredTerms} locale={locale} />

      <Divider />

      <SectionTitle>{t('categoryPage.categoriesTitle')}</SectionTitle>

      <CategoryIndex locale={locale} currentCategory={category} />

      <Divider />

      <Breadcrumb
        items={[{ label: t('title'), href: '/glossary' }, { label: t(`categories.${category}`) }]}
        locale={locale}
      />
    </div>
  );
}
