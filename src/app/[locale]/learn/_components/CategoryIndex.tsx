import { Link } from '@/i18n/routing';

import type { ArticleCategory } from '../_lib/types';
import { CATEGORY_STYLES } from '../_lib/types';

type CategoryInfo = {
  category: ArticleCategory;
  label: string;
  count: number;
};

type Props = {
  categories: CategoryInfo[];
  selectedCategory?: ArticleCategory;
  locale: string;
  allLabel: string;
  countLabel: (count: number) => string;
};

export function CategoryIndex({
  categories,
  selectedCategory,
  locale,
  allLabel,
  countLabel,
}: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <Link
        href="/learn"
        locale={locale}
        className={`group block p-4 rounded-xl border transition-all ${
          !selectedCategory
            ? 'bg-foreground/10 border-foreground/30'
            : 'bg-card border-border hover:shadow-md hover:border-foreground/20'
        }`}
      >
        <div className="flex flex-col items-center text-center gap-2">
          <span className="text-2xl">📚</span>
          <span className="font-medium text-foreground">{allLabel}</span>
        </div>
      </Link>
      {categories.map(({ category, label, count }) => {
        const style = CATEGORY_STYLES[category];
        const isSelected = selectedCategory === category;
        return (
          <Link
            key={category}
            href={`/learn/category/${category}`}
            locale={locale}
            className={`group block p-4 rounded-xl border transition-all ${
              isSelected
                ? 'bg-foreground/10 border-foreground/30'
                : 'bg-card border-border hover:shadow-md hover:border-foreground/20'
            }`}
          >
            <div className="flex flex-col items-center text-center gap-2">
              <span className="text-2xl">{style.icon}</span>
              <span className="font-medium text-foreground">{label}</span>
              <span className="text-xs text-muted-foreground">{countLabel(count)}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
