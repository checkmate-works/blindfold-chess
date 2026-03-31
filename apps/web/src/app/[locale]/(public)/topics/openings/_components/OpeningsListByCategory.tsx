'use client';

import { useMemo } from 'react';

import { useTranslations } from 'next-intl';

import { parseAsString, useQueryState } from 'nuqs';

import { OPENING_CATEGORIES, classifyEcoCode } from '../_lib/categories';
import type { OpeningCategory } from '../_lib/categories';
import { getOpeningDisplayName } from '../_lib/get-opening-display-name';
import type { OpeningWithChildren } from '../_lib/queries';
import { OpeningCard } from './OpeningCard';

type Props = {
  openings: OpeningWithChildren[];
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {filteredOpenings.map((opening) => (
        <div key={opening.id}>
          <OpeningCard
            opening={opening}
            displayName={getOpeningDisplayName(nameT, opening.slug, opening.name)}
            locale={locale}
          />
          {opening.children.length > 0 && (
            <div className="border-l-2 border-border ml-4 pl-2 mt-1 space-y-1">
              {opening.children.map((child) => (
                <OpeningCard
                  key={child.id}
                  opening={child}
                  displayName={getOpeningDisplayName(nameT, child.slug, child.name)}
                  locale={locale}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
