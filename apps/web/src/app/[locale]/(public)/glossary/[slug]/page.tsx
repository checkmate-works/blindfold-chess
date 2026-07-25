import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SITE_URL, SUPPORTED_LOCALES } from '@/config';

import { chessTerms } from '@/lib/db/data/chess-terms';
import { slugifyTerm } from '@/lib/glossary/slug';
import { getPositionsForTerm } from '@/lib/glossary/term-positions';
import { resolveCspNonce } from '@/lib/security/nonce';
import { JsonLd, generateDefinedTermSchema } from '@/lib/seo/jsonld';

import { LinkTabs, PageLayout, SectionTitle } from '@/app/[locale]/_components';
import type { LinkTabItem } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { TermProblemList } from '../_components/TermProblemList';
import { getGlossaryTermBySlug } from '../_lib/queries';
import type { ChessTerm } from '../_lib/types';
import { CATEGORY_COLORS } from '../_lib/types';

const GlossaryPositionBoard = dynamic(() =>
  import('../_components/GlossaryPositionBoard').then((mod) => mod.GlossaryPositionBoard)
);

export const revalidate = 3600;

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<{ tab?: string }>;
};

/**
 * Resolve which related-content tab is active from the `?tab=` param, falling
 * back to the first available tab when it's absent or unrecognized.
 */
function resolveActiveTab(param: string | undefined, tabs: LinkTabItem[]): string {
  const match = tabs.find((tab) => tab.value === param);
  return match?.value ?? tabs[0].value;
}

/**
 * Pre-render every (locale × term) at build time. Slugs are derived from the
 * code-is-source-of-truth seed data via the same `slugifyTerm` the seeder
 * uses, so the two can never disagree. `dynamicParams` stays at its default
 * `true` so a term added to the DB out-of-band still renders on first visit.
 */
export function generateStaticParams(): { locale: Locale; slug: string }[] {
  const slugs = [...new Set(chessTerms.map((term) => slugifyTerm(term.term)))];
  return SUPPORTED_LOCALES.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

function displayName(term: ChessTerm, locale: string): string {
  return locale === 'ja' && term.termJa ? term.termJa : term.term;
}

function displayDefinition(term: ChessTerm, locale: string): string {
  return locale === 'en' && term.definitionEn ? term.definitionEn : term.definition;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const term = await getGlossaryTermBySlug(slug, locale);
  const t = await getTranslations({ locale, namespace: 'glossary' });

  if (!term) {
    return { title: resolveTitle(t('title'), locale) };
  }

  const name = displayName(term, locale);
  const description = displayDefinition(term, locale).slice(0, 160).replace(/\n/g, ' ').trim();

  return {
    ...generateCanonicalMetadata({ locale, path: `glossary/${slug}`, title: name, description }),
    title: resolveTitle(name, locale),
    description,
  };
}

export default async function GlossaryTermPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const term = await getGlossaryTermBySlug(slug, locale);
  if (!term) notFound();

  const t = await getTranslations({ locale, namespace: 'glossary' });
  const nonce = await resolveCspNonce();

  const name = displayName(term, locale);
  const description = displayDefinition(term, locale);
  const termUrl = `${SITE_URL}/${locale}/glossary/${slug}`;
  const glossaryUrl = `${SITE_URL}/${locale}/glossary`;

  // Secondary names shown under the H1: for ja the H1 is the Japanese name,
  // so surface the canonical English term (and reading, when it adds info).
  const subtitleParts = [
    locale === 'ja' && term.term !== name ? term.term : null,
    term.reading && term.reading !== name ? term.reading : null,
  ].filter((part): part is string => Boolean(part));
  const headerNote = subtitleParts.length > 0 ? subtitleParts.join(' ・ ') : undefined;

  // Insert the letter-index page (e.g. `/glossary/letter/t`) as an
  // intermediate breadcrumb, matching how terms are grouped in the glossary.
  // The letter derives from the English term's first char (same as
  // `getTermsByLetter`, which keys on `upper(left(term_en, 1))`). Letter
  // pages exist for A–Z only (`dynamicParams = false`), so terms that start
  // with a non-letter skip the crumb rather than link to a 404.
  const firstChar = term.term.charAt(0).toUpperCase();
  const hasLetterCrumb = firstChar >= 'A' && firstChar <= 'Z';
  const breadcrumb = [
    { label: t('title'), href: '/glossary' },
    ...(hasLetterCrumb
      ? [{ label: firstChar, href: `/glossary/letter/${firstChar.toLowerCase()}` }]
      : []),
    { label: name },
  ];

  // Related-content tabs (chunk-detail style, URL-driven via `?tab=`). Only
  // "problems" today; future collections (e.g. related games) append here.
  const problems = await getPositionsForTerm(slug);
  const relatedTabs: LinkTabItem[] = [];
  if (problems.length > 0) {
    relatedTabs.push({
      value: 'problems',
      label: `${t('related.problems')} (${problems.length})`,
      href: `/glossary/${slug}?tab=problems`,
    });
  }
  const hasRelated = relatedTabs.length > 0;
  // Reading `searchParams` opts a page into dynamic rendering, so only touch it
  // for terms that actually have related tabs — plain (non-theme) term pages
  // stay statically generated.
  const activeTab = hasRelated ? resolveActiveTab((await searchParams).tab, relatedTabs) : null;

  return (
    <>
      <JsonLd
        data={generateDefinedTermSchema({
          name,
          description,
          url: termUrl,
          inLanguage: locale,
          termSetName: t('title'),
          termSetUrl: glossaryUrl,
        })}
        nonce={nonce}
      />
      <PageLayout title={name} headerNote={headerNote} locale={locale} breadcrumb={breadcrumb}>
        <div className="space-y-3">
          <SectionTitle>{t('descriptionHeading')}</SectionTitle>
          <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{description}</p>
        </div>

        {term.positions && term.positions.length > 0 && (
          <GlossaryPositionBoard positions={term.positions} />
        )}

        {(term.category || (term.aliases && term.aliases.length > 0)) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {term.category && (
              <Link
                href={`/${locale}/glossary/category/${term.category}`}
                className={`inline-block rounded-full px-3 py-1 text-sm font-medium transition-opacity hover:opacity-80 ${
                  CATEGORY_COLORS[term.category] || CATEGORY_COLORS.general
                }`}
              >
                {t(`categories.${term.category}`)}
              </Link>
            )}
            {term.aliases && term.aliases.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {t('aliases')}: {term.aliases.join(', ')}
              </span>
            )}
          </div>
        )}

        {hasRelated && activeTab && (
          <div className="space-y-6">
            <LinkTabs
              variant="underline"
              locale={locale}
              activeValue={activeTab}
              scroll={false}
              aria-label={t('related.tabsLabel')}
              items={relatedTabs}
            />
            {activeTab === 'problems' && <TermProblemList problems={problems} locale={locale} />}
          </div>
        )}

        <AdSlot slot="content-bottom" />
      </PageLayout>
    </>
  );
}
