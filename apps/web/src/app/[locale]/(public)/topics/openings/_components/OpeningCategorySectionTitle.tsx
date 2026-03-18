'use client';

import { useTranslations } from 'next-intl';

import { parseAsString, useQueryState } from 'nuqs';

import { SectionTitle } from '@/app/[locale]/_components';

import { OPENING_CATEGORIES } from '../_lib/categories';
import type { OpeningCategory } from '../_lib/categories';

export function OpeningCategorySectionTitle() {
  const t = useTranslations('topics.openings.categoryFilter');
  const [category] = useQueryState('category', parseAsString.withDefault('open'));

  const currentCategory: OpeningCategory = OPENING_CATEGORIES.includes(category as OpeningCategory)
    ? (category as OpeningCategory)
    : 'open';

  return <SectionTitle>{t(currentCategory)}</SectionTitle>;
}
