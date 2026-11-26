/**
 * The shapes of the web's dojo guides (教本, `guides.pages.<rank>` in the
 * web dictionaries) as `scripts/bundle-guides.ts` copies them.
 */

/**
 * One paragraph-sized block of prose: plain text, a bold heading over its
 * body, or a bulleted list. Text may carry the web's glossary markup
 * `[[slug|label]]` and authored line breaks.
 */
export type GuideParagraph =
  | string
  | { readonly heading: string; readonly body: string }
  | { readonly items: readonly string[] };

export type GuidePage = { readonly paragraphs: readonly GuideParagraph[] };

/**
 * A guide read page by page. The web also defines a chaptered format, but no
 * guide uses it; the generator refuses one, so the app grows a chapter
 * screen only when a guide needs it.
 */
export type FlatGuide = {
  readonly format: "flat";
  readonly pages: readonly GuidePage[];
};

/**
 * A link card the web shows after a paragraph: an article, a practice, a
 * page of the web app. `href` is the web path without the locale.
 */
export type GuideInlineLink = {
  readonly href: string;
  readonly label: string;
  readonly leadIn?: string;
};

/** The guides of one language, and the few strings their pages need. */
export type GuideLocaleContent = {
  readonly guides: Readonly<Record<string, FlatGuide>>;
  /** Keyed `<rank>:<page>:<paragraph>` (1-based page, 0-based paragraph). */
  readonly links: Readonly<Record<string, GuideInlineLink>>;
  readonly strings: {
    /** "教本" — the guides' own name. */
    readonly title: string;
    /** "<link>{rankName}</link>の解説": the heading over a guide. */
    readonly indexTitleWithRank: string;
    readonly prevRank: string;
    readonly nextRank: string;
    readonly diagonalTables: {
      readonly start: string;
      readonly end: string;
      readonly aFileStart: string;
      readonly rank1Start: string;
      readonly rank8Start: string;
    };
  };
};

/** A board or table the web draws after a paragraph, by its component name. */
export type GuideVisualAidRef<Name extends string = string> = {
  readonly component: Name;
  readonly props: Readonly<Record<string, string | readonly string[]>>;
};
