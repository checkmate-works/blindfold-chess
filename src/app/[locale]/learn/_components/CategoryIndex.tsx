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
};

export function CategoryIndex({ categories, selectedCategory, locale }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/learn"
        locale={locale}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
          !selectedCategory
            ? 'bg-foreground text-background'
            : 'bg-secondary text-foreground hover:bg-secondary/80'
        }`}
      >
        📚
        <span>All</span>
      </Link>
      {categories.map(({ category, label, count }) => {
        const style = CATEGORY_STYLES[category];
        const isSelected = selectedCategory === category;
        return (
          <Link
            key={category}
            href={`/learn/category/${category}`}
            locale={locale}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              isSelected
                ? 'bg-foreground text-background'
                : `${style.bgColor} ${style.color} hover:opacity-80`
            }`}
          >
            <span>{style.icon}</span>
            <span>{label}</span>
            <span
              className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                isSelected ? 'bg-background/20' : 'bg-foreground/10'
              }`}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
