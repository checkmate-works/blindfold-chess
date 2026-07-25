import React from 'react';
import type { ReactNode } from 'react';

import type { RankSlug } from '@/lib/db/data/ranks';
import { collectTermSlugs, parseTermMarkup } from '@/lib/glossary/term-markup';
import { isGuideListParagraph } from '@/lib/guides';
import type { GuidePage, GuideParagraph } from '@/lib/guides';

import { GuideLinkCard } from '@/app/[locale]/(public)/dojo/ranks/_components/GuideLinkCard';
import { TermLink } from '@/app/[locale]/_components/glossary-term/TermLink';

import { getGuideInlineLink } from '../paragraphInlineLinks';
import { getVisualAid } from '../paragraphVisualAids';
import type { Translator } from './context';

/**
 * Render a single prose string, converting `[[slug|label]]` glossary markup
 * into clickable {@link TermLink}s. Only slugs present in `validSlugs` (terms
 * that actually resolved in the DB) become links; any other markup — an
 * unknown slug, or a page rendered without a term index — degrades to its
 * plain label text. A string with no markup is returned as-is so the common
 * case adds no wrapper nodes.
 */
function renderProseWithTerms(
  text: string,
  locale: string,
  validSlugs: ReadonlySet<string>
): ReactNode {
  const tokens = parseTermMarkup(text);
  if (tokens.every((token) => token.type === 'text')) {
    return text;
  }
  return tokens.map((token, i) => {
    if (token.type === 'text') return <React.Fragment key={i}>{token.value}</React.Fragment>;
    if (!validSlugs.has(token.slug)) return <React.Fragment key={i}>{token.label}</React.Fragment>;
    return (
      <TermLink key={i} slug={token.slug} href={`/${locale}/glossary/${token.slug}`}>
        {token.label}
      </TermLink>
    );
  });
}

/**
 * Collect every distinct glossary slug referenced across a page's paragraphs.
 * Used by the flat-body renderer to fetch only the linked terms and build the
 * preview map handed to the term-modal provider.
 */
export function collectPageTermSlugs(page: GuidePage): string[] {
  const slugs = new Set<string>();
  const add = (text: string) => {
    for (const slug of collectTermSlugs(text)) slugs.add(slug);
  };
  for (const paragraph of page.paragraphs) {
    if (typeof paragraph === 'string') add(paragraph);
    else if (isGuideListParagraph(paragraph)) paragraph.items.forEach(add);
    else add(paragraph.body);
  }
  return [...slugs];
}

/**
 * The prose part of a paragraph block, dispatched on the paragraph's shape
 * (plain string / bulleted list / heading + body — see {@link GuideParagraph}).
 *
 * `whitespace-pre-line` keeps authored `\n` as a line break while still
 * collapsing the incidental indentation of the JSON message files.
 */
function renderParagraphProse(
  paragraph: GuideParagraph,
  locale: string,
  validSlugs: ReadonlySet<string>
): ReactNode {
  if (typeof paragraph === 'string') {
    return (
      <p className="whitespace-pre-line text-foreground/80">
        {renderProseWithTerms(paragraph, locale, validSlugs)}
      </p>
    );
  }
  if (isGuideListParagraph(paragraph)) {
    return (
      <ul className="ml-6 list-disc space-y-2 text-foreground/80">
        {paragraph.items.map((item, i) => (
          <li key={i} className="whitespace-pre-line">
            {renderProseWithTerms(item, locale, validSlugs)}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p className="whitespace-pre-line text-foreground/80">
      <strong className="block">{paragraph.heading}</strong>
      {renderProseWithTerms(paragraph.body, locale, validSlugs)}
    </p>
  );
}

/**
 * Render a single paragraph-sized block: the paragraph prose itself, its
 * optional visual aid, and its optional inline link card. This is the
 * innermost "block type" — the file's content model has only one block
 * shape, because prose/visual-aid/inline-link travel together per paragraph.
 */
function renderParagraphBlock({
  rankSlug,
  pageNumber,
  index,
  paragraph,
  tGuides,
  locale,
  validSlugs,
}: {
  rankSlug: RankSlug;
  pageNumber: number;
  index: number;
  paragraph: GuideParagraph;
  tGuides: Translator;
  locale: string;
  validSlugs: ReadonlySet<string>;
}): ReactNode {
  const linkInfo = getGuideInlineLink(rankSlug, pageNumber, index, locale, tGuides);

  return (
    <React.Fragment key={index}>
      {renderParagraphProse(paragraph, locale, validSlugs)}
      {getVisualAid(rankSlug, pageNumber, index)}
      {linkInfo && (
        <>
          {linkInfo.leadIn && <p className="text-foreground/80">{linkInfo.leadIn}</p>}
          <GuideLinkCard items={[{ label: linkInfo.label, href: linkInfo.href }]} />
        </>
      )}
    </React.Fragment>
  );
}

/**
 * Render a single page of paragraphs with visual aids and inline links.
 */
export function renderPageParagraphs({
  rankSlug,
  pageNumber,
  page,
  tGuides,
  locale,
  validSlugs = EMPTY_SLUG_SET,
}: {
  rankSlug: RankSlug;
  pageNumber: number;
  page: GuidePage;
  tGuides: Translator;
  locale: string;
  /**
   * Glossary slugs that resolved to a real term for this page. Defaults to
   * empty, so callers that do not opt into term links (e.g. chaptered
   * bodies) render any `[[...]]` markup as plain text rather than links.
   */
  validSlugs?: ReadonlySet<string>;
}): ReactNode {
  return (
    <div className="space-y-4">
      {page.paragraphs.map((paragraph, i) =>
        renderParagraphBlock({
          rankSlug,
          pageNumber,
          index: i,
          paragraph,
          tGuides,
          locale,
          validSlugs,
        })
      )}
    </div>
  );
}

const EMPTY_SLUG_SET: ReadonlySet<string> = new Set();
