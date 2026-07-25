import { getGlossaryTerms } from '@/app/[locale]/(public)/glossary/_lib/queries';
import type { TermPreview } from '@/app/[locale]/_components/glossary-term/types';

/**
 * Resolve the lightweight {@link TermPreview} data for the glossary slugs a
 * guide page links, keyed by slug. Terms that no longer exist in the DB are
 * silently dropped (the renderer degrades their markup to plain text).
 *
 * Reads through the shared `getGlossaryTerms` cache (tag `glossary`, 1h), so
 * this adds no per-request DB cost on a warm cache. Locale selection mirrors
 * `GlossaryTermList`: ja shows the Japanese name + reading; en prefers the
 * English definition.
 */
export async function resolveTermPreviews(
  slugs: string[],
  locale: string
): Promise<Record<string, TermPreview>> {
  if (slugs.length === 0) return {};

  const wanted = new Set(slugs);
  const terms = await getGlossaryTerms(locale);

  const previews: Record<string, TermPreview> = {};
  for (const term of terms) {
    if (!term.slug || !wanted.has(term.slug)) continue;
    previews[term.slug] = {
      slug: term.slug,
      name: locale === 'ja' && term.termJa ? term.termJa : term.term,
      reading: locale === 'ja' ? term.reading : undefined,
      definition: locale === 'en' && term.definitionEn ? term.definitionEn : term.definition,
      href: `/${locale}/glossary/${term.slug}`,
    };
  }
  return previews;
}
