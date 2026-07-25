import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { SITE_URL, SUPPORTED_LOCALES } from '@/config';

import { chessTerms } from '@/lib/db/data/chess-terms';
import { slugifyTerm } from '@/lib/glossary/slug';
import { resolveCspNonce } from '@/lib/security/nonce';
import { JsonLd, generateDefinedTermSchema } from '@/lib/seo/jsonld';

import { PageLayout } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GlossaryTermList } from '../_components/GlossaryTermList';
import { getGlossaryTermBySlug } from '../_lib/queries';
import type { ChessTerm } from '../_lib/types';

export const revalidate = 3600;

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
};

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

export default async function GlossaryTermPage({ params }: Props) {
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
      <PageLayout
        title={name}
        locale={locale}
        breadcrumb={[{ label: t('title'), href: '/glossary' }, { label: name }]}
      >
        <GlossaryTermList terms={[term]} locale={locale} />
        <AdSlot slot="content-bottom" />
      </PageLayout>
    </>
  );
}
