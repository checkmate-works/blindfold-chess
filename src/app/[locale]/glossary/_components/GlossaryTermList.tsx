import { getTranslations } from 'next-intl/server';
// Note: Using standard next/link instead of @/i18n/routing Link
// to avoid DYNAMIC_SERVER_USAGE errors in production.
// Server Components should use standard Link with explicit locale in href.
import Link from 'next/link';

import { ChessTerm } from '@/app/[locale]/_lib/types';

interface GlossaryTermListProps {
  terms: ChessTerm[];
  locale: string;
}

const categoryColors = {
  tactics: 'bg-destructive/10 text-destructive',
  strategy: 'bg-primary/10 text-primary',
  endgame: 'bg-secondary/10 text-secondary-foreground',
  opening: 'bg-muted/50 text-muted-foreground',
  structure: 'bg-accent/50 text-accent-foreground',
  general: 'bg-card text-card-foreground',
};

export async function GlossaryTermList({ terms, locale }: GlossaryTermListProps) {
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
                  categoryColors[term.category] || categoryColors.general
                }`}
              >
                {t(`categories.${term.category}`)}
              </Link>
            )}
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {locale === 'en' && term.definitionEn ? term.definitionEn : term.definition}
          </p>
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
