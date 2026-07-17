import React from 'react';
import type { ReactNode } from 'react';

import type { RankSlug } from '@/lib/db/data/ranks';
import { isGuideListParagraph } from '@/lib/guides';
import type { GuidePage, GuideParagraph } from '@/lib/guides';

import { GuideLinkCard } from '@/app/[locale]/(public)/ranks/_components/GuideLinkCard';

import { getGuideInlineLink } from '../paragraphInlineLinks';
import { getVisualAid } from '../paragraphVisualAids';
import type { Translator } from './context';

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
}: {
  rankSlug: RankSlug;
  pageNumber: number;
  index: number;
  paragraph: GuideParagraph;
  tGuides: Translator;
  locale: string;
}): ReactNode {
  const linkInfo = getGuideInlineLink(rankSlug, pageNumber, index, locale, tGuides);

  return (
    <React.Fragment key={index}>
      {/* `whitespace-pre-line` keeps authored `\n` as a line break while still
          collapsing the incidental indentation of the JSON message files. */}
      {typeof paragraph === 'string' ? (
        <p className="whitespace-pre-line text-foreground/80">{paragraph}</p>
      ) : isGuideListParagraph(paragraph) ? (
        <ul className="ml-6 list-disc space-y-2 text-foreground/80">
          {paragraph.items.map((item, i) => (
            <li key={i} className="whitespace-pre-line">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="whitespace-pre-line text-foreground/80">
          <strong className="block">{paragraph.heading}</strong>
          {paragraph.body}
        </p>
      )}
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
}: {
  rankSlug: RankSlug;
  pageNumber: number;
  page: GuidePage;
  tGuides: Translator;
  locale: string;
}): ReactNode {
  return (
    <div className="space-y-4">
      {page.paragraphs.map((paragraph, i) =>
        renderParagraphBlock({ rankSlug, pageNumber, index: i, paragraph, tGuides, locale })
      )}
    </div>
  );
}
