import type { RankSlug } from '@/lib/db/data/ranks';

/**
 * A paragraph carrying a bold lead-in heading above its body (e.g. 5kyu's
 * "Step 1 / Step 2 / Step 3" breakdown).
 *
 * This used to be encoded as a single string whose first `\n`-delimited line
 * became the heading. That overloaded `\n`, leaving no way to express an
 * ordinary line break inside a paragraph — an author who broke a line for
 * readability silently got a bold heading instead. Headings are explicit now,
 * which frees `\n` in a plain-string paragraph to mean exactly one line break.
 */
export type GuideHeadingParagraph = {
  heading: string;
  body: string;
};

/**
 * A bulleted list — e.g. 1kyu's enumeration of the objections to memorising
 * openings. Kept as its own shape rather than a `\n`-delimited string so the
 * items stay addressable (and so a line break inside one item remains free to
 * mean a line break).
 */
export type GuideListParagraph = {
  items: string[];
};

/**
 * A plain string renders as prose with `\n` preserved as a line break; a
 * `{ heading, body }` renders as a bold heading followed by its body; an
 * `{ items }` renders as a bulleted list.
 */
export type GuideParagraph = string | GuideHeadingParagraph | GuideListParagraph;

export type GuidePage = {
  paragraphs: GuideParagraph[];
};

/** Narrow a paragraph to its bulleted-list shape. */
export function isGuideListParagraph(paragraph: GuideParagraph): paragraph is GuideListParagraph {
  return typeof paragraph !== 'string' && 'items' in paragraph;
}

/**
 * Flatten a paragraph to plain text, for callers that need prose without
 * markup (teasers, metadata descriptions). Line breaks collapse to spaces
 * because the consumers are single-line contexts.
 */
export function paragraphToPlainText(paragraph: GuideParagraph): string {
  const raw =
    typeof paragraph === 'string'
      ? paragraph
      : isGuideListParagraph(paragraph)
        ? paragraph.items.join(' ')
        : `${paragraph.heading} ${paragraph.body}`;
  return raw.replace(/\s*\n\s*/g, ' ').trim();
}

export type GuideChapter = {
  slug: string;
  title: string;
  description: string;
  pages: GuidePage[];
};

export type FlatGuide = {
  format: 'flat';
  pages: GuidePage[];
};

export type ChapteredGuide = {
  format: 'chaptered';
  chapters: GuideChapter[];
};

export type RankGuide = FlatGuide | ChapteredGuide;

/**
 * Resolve the guide definition for a rank slug from `guides.pages` translations.
 * Returns `null` if the rank has no guide data configured.
 */
export function getRankGuide(
  guidesPages: Record<string, unknown>,
  slug: RankSlug
): RankGuide | null {
  const raw = guidesPages[slug];
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<RankGuide>;
  if (candidate.format === 'flat' && Array.isArray((candidate as FlatGuide).pages)) {
    return candidate as FlatGuide;
  }
  if (candidate.format === 'chaptered' && Array.isArray((candidate as ChapteredGuide).chapters)) {
    return candidate as ChapteredGuide;
  }
  return null;
}

export function findChapter(guide: ChapteredGuide, chapterSlug: string): GuideChapter | null {
  return guide.chapters.find((c) => c.slug === chapterSlug) ?? null;
}
