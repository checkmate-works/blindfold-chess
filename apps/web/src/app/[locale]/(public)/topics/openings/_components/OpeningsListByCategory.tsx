'use client';

import { useMemo } from 'react';

import { useTranslations } from 'next-intl';

import { parseAsString, useQueryState } from 'nuqs';

import type { ChessOpening } from '@/lib/db';

import { OPENING_CATEGORIES, classifyEcoCode } from '../_lib/categories';
import type { OpeningCategory } from '../_lib/categories';
import { OpeningCard } from './OpeningCard';

type Props = {
  openings: ChessOpening[];
  locale: string;
};

export function OpeningsListByCategory({ openings, locale }: Props) {
  const nameT = useTranslations('topics.openings.names');
  const [category] = useQueryState('category', parseAsString.withDefault('open'));

  const currentCategory: OpeningCategory = OPENING_CATEGORIES.includes(category as OpeningCategory)
    ? (category as OpeningCategory)
    : 'open';

  const filteredOpenings = useMemo(
    () => openings.filter((o) => classifyEcoCode(o.ecoCode) === currentCategory),
    [openings, currentCategory]
  );

  const getDisplayName = (slug: string, fallback: string) => {
    const translated = nameT(slug as never);
    return translated === `topics.openings.names.${slug}` ? fallback : translated;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {filteredOpenings.map((opening) => (
        <OpeningCard
          key={opening.id}
          opening={opening}
          displayName={getDisplayName(opening.slug, opening.name)}
          locale={locale}
        />
      ))}
    </div>
  );
}
