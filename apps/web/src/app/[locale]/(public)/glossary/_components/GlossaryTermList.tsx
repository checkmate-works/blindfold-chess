import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';
// Note: Using standard next/link instead of @/i18n/routing Link
// to avoid DYNAMIC_SERVER_USAGE errors in production.
// Server Components should use standard Link with explicit locale in href.
import Link from 'next/link';

import { getNativeAdCreatives } from '@/lib/ads/ad';
import { withRepeatingNativeAds } from '@/lib/ads/placement';
import { GLOSSARY_TERM_LIST_NATIVE_AD_SLOT } from '@/lib/ads/registry';
import { slugifyTerm } from '@/lib/glossary/slug';

import { NativeAdCard } from '@/app/[locale]/_components/NativeAdCard';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { ChessTerm } from '../_lib/types';
import { CATEGORY_COLORS } from '../_lib/types';

const GlossaryPositionBoard = dynamic(() =>
  import('./GlossaryPositionBoard').then((mod) => mod.GlossaryPositionBoard)
);

type Props = {
  terms: ChessTerm[];
  locale: Locale;
};

/**
 * The terms under a letter or a category, and the one place the glossary
 * carries an ad.
 *
 * The creatives come from the cached, viewer-independent read rather than
 * `resolveNativeAds`: both pages that render this list are prerendered, and
 * `resolveNativeAds` would read the viewer — and therefore `cookies()` —
 * which turns them dynamic. Hiding the card from a paying reader is the
 * `bfc_ads_hidden` cookie's job here, through the CSS rule on the
 * `.ad-slot-wrapper` that `NativeAdCard` owns. That is the whole entitlement
 * layer on this surface, which is what that cookie exists for.
 */
export async function GlossaryTermList({ terms, locale }: Props) {
  const [t, nativeAdCreatives] = await Promise.all([
    getTranslations({ locale, namespace: 'glossary' }),
    getNativeAdCreatives(GLOSSARY_TERM_LIST_NATIVE_AD_SLOT, locale),
  ]);

  if (terms.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>{t('noTerms')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {withRepeatingNativeAds(
        terms.map((term) => (
          <div
            key={term.term}
            id={term.term.toLowerCase().replace(/\s+/g, '-')}
            className="bg-card rounded-xl p-4 md:p-6 border border-border"
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-4 mb-3">
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  <Link
                    href={`/${locale}/glossary/${term.slug ?? slugifyTerm(term.term)}`}
                    // eslint-disable-next-line no-restricted-syntax -- navigation list: the list of terms under its letter is the affordance; hover is a pointer nicety
                    className="hover:text-link-primary hover:underline"
                  >
                    {term.term}
                    {locale === 'ja' && term.termJa && (
                      <span className="ml-2 text-lg text-muted-foreground">
                        ({term.termJa}
                        {term.reading && <span className="text-sm ml-1">{term.reading}</span>})
                      </span>
                    )}
                  </Link>
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
        )),
        nativeAdCreatives,
        (creative, key) => (
          <NativeAdCard key={key} creative={creative} locale={locale} variant="card" />
        )
      )}
    </div>
  );
}
