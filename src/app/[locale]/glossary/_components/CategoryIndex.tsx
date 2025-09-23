import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { chessTerms } from '../_data/chess-terms';

interface CategoryIndexProps {
  currentCategory?: string;
  locale: string;
}

const categoryStyles = {
  tactics: { color: 'bg-destructive/10 text-destructive', icon: '⚔️' },
  strategy: { color: 'bg-primary/10 text-primary', icon: '🎯' },
  endgame: { color: 'bg-secondary/10 text-secondary-foreground', icon: '♔' },
  opening: { color: 'bg-muted/50 text-muted-foreground', icon: '📖' },
  structure: { color: 'bg-accent/50 text-accent-foreground', icon: '♟' },
  general: { color: 'bg-card text-card-foreground', icon: '📋' },
};

export async function CategoryIndex({ currentCategory, locale }: CategoryIndexProps) {
  const t = await getTranslations({ locale, namespace: 'glossary' });

  // Get category counts
  const categoryCounts: Record<string, number> = {};
  chessTerms.forEach((term) => {
    if (term.category) {
      categoryCounts[term.category] = (categoryCounts[term.category] || 0) + 1;
    }
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {Object.entries(categoryStyles).map(([category, { color, icon }]) => {
        const count = categoryCounts[category] || 0;
        const isActive = currentCategory === category;

        return (
          <Link
            key={category}
            href={`/${locale}/glossary/category/${category}`}
            className={`p-6 rounded-xl shadow-sm border transition-colors ${
              isActive ? 'bg-muted border-foreground/20' : 'bg-card hover:bg-muted/50 border-border'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">{icon}</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>
                {count} {t('terms')}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-foreground">{t(`categories.${category}`)}</h3>
          </Link>
        );
      })}
    </div>
  );
}
