import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';
// Note: Using standard next/link instead of @/i18n/routing Link
// to avoid DYNAMIC_SERVER_USAGE errors in production.
// Server Components should use standard Link with explicit locale in href.
import Link from 'next/link';

import type { ChessTerm } from '@/app/[locale]/_lib/types';

import { CATEGORY_COLORS } from '../_lib/types';

const GlossaryPositionBoard = dynamic(() =>
  import('./GlossaryPositionBoard').then((mod) => mod.GlossaryPositionBoard)
);

type Props = {
  terms: ChessTerm[];
  locale: string;
};

export async function GlossaryTermList({ terms, locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'glossary' });

  return (
    <div className="space-y-4">
      {terms.map((term) => (
        <div
          key={term.term}
          id={term.term.toLowerCase().replace(/\s+/g, '-')}
          className="bg-card rounded-xl p-4 md:p-6 shadow-sm border border-border"
        >
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-4 mb-3">
            <div>
              <h3 className="text-xl font-bold text-foreground">
                {term.term}
                {locale === 'ja' && term.termJa && (
                  <span className="ml-2 text-lg text-muted-foreground">
                    ({term.termJa}
                    {term.reading && <span className="text-sm ml-1">{term.reading}</span>})
                  </span>
                )}
              </h3>
              {term.aliases && term.aliases.length > 0 && (
                <div className="mt-1 text-sm text-muted-foreground">
                  {t('aliases')}: {term.aliases.join(', ')}
                </div>
              )}
            </div>
            {term.category && (
              <Link
                href={`/${locale}/glossary/category/${term.category}`}
                className={`px-3 py-1 rounded-full text-sm font-medium inline-block hover:opacity-80 transition-opacity ${
                  CATEGORY_COLORS[term.category] || CATEGORY_COLORS.general
                }`}
              >
                {t(`categories.${term.category}`)}
              </Link>
            )}
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {locale === 'en' && term.definitionEn ? term.definitionEn : term.definition}
          </p>
          {term.positions && term.positions.length > 0 && (
            <GlossaryPositionBoard positions={term.positions} />
          )}
          {term.relatedTerms && term.relatedTerms.length > 0 && (
            <div className="mt-3 text-sm text-muted-foreground">
              {t('relatedTerms')}:{' '}
              {term.relatedTerms.map((relatedTerm, index) => (
                <span key={relatedTerm}>
                  <a
                    href={`#${relatedTerm.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-foreground underline hover:opacity-80"
                  >
                    {relatedTerm}
                  </a>
                  {index < term.relatedTerms!.length - 1 && ', '}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
