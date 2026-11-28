/**
 * Copies the web's dojo guides (教本) into `src/features/guides/generated/`:
 *
 * - the text, `guides.pages` of the four web dictionaries, with the strings
 *   the guide pages need around it (`guides.top.title`,
 *   `guides.ranks.indexTitleWithRank`, `guides.navigation.*`,
 *   `guides.visualAids.diagonalPatternTables.*`);
 * - the link card after a paragraph, from the web's `getGuideInlineLink`
 *   (`paragraphInlineLinks.ts`), which is imported and asked about every
 *   paragraph, with its label in each language;
 * - each guide's title, the web's curriculum section for its rank
 *   (`CURRICULUM` in `lib/db/data/curriculum.ts`, worded by
 *   `dojo.curriculum.sections.*`), which the web's guide index lists under
 *   the rank name. A guided rank with other than one section stops the
 *   script: the app lists one row per guide, so two sections would need
 *   a row of their own each;
 * - which board or table follows a paragraph, read out of the web's
 *   `VISUAL_AID_MAP` (`paragraphVisualAids.tsx`) as a component name and its
 *   literal props. That file imports the web's React components, so it is
 *   parsed as text rather than imported; an entry the parser cannot read
 *   stops the script instead of being dropped.
 *
 * The component names are also written out as a union type, so a visual aid
 * the app has no native renderer for fails the typecheck.
 *
 * Every paragraph is checked against the three shapes the app renders
 * (text, heading + body, list), and a chaptered guide is refused: the app
 * has no chapter screen, and should get one when a guide needs it.
 *
 * Run from apps/mobile after the web guides change: `pnpm bundle-guides`.
 * Generated, not edited by hand.
 */
import { mkdir, readFile, writeFile } from "fs/promises";
import { join, resolve } from "path";
import { pathToFileURL } from "url";

const WEB = resolve("../web/src");
const GUIDE_LIB = join(WEB, "app/[locale]/(public)/dojo/guides/[rank]/_lib");
const OUT_DIR = resolve("src/features/guides/generated");
const LOCALES = ["ja", "en", "es", "pt-BR"] as const;

type Paragraph =
  string | { heading: string; body: string } | { items: string[] };
type Page = { paragraphs: Paragraph[] };

function isParagraph(value: unknown): value is Paragraph {
  if (typeof value === "string") return true;
  if (typeof value !== "object" || value === null) return false;
  const keys = Object.keys(value).sort().join(",");
  const v = value as Record<string, unknown>;
  if (keys === "body,heading") {
    return typeof v.heading === "string" && typeof v.body === "string";
  }
  if (keys === "items") {
    return (
      Array.isArray(v.items) && v.items.every((i) => typeof i === "string")
    );
  }
  return false;
}

function readGuides(
  locale: string,
  pages: Record<string, unknown>,
): Record<string, { format: "flat"; pages: Page[] }> {
  const out: Record<string, { format: "flat"; pages: Page[] }> = {};
  for (const [rank, guide] of Object.entries(pages)) {
    const g = guide as { format?: string; pages?: unknown[] };
    if (g.format !== "flat" || !Array.isArray(g.pages)) {
      throw new Error(
        `${locale} guides.pages.${rank}: format "${g.format}" — the app renders flat guides only; add a chapter screen before bundling a chaptered one`,
      );
    }
    g.pages.forEach((page, i) => {
      const paragraphs = (page as { paragraphs?: unknown[] }).paragraphs;
      if (!Array.isArray(paragraphs)) {
        throw new Error(`${locale} ${rank} page ${i + 1}: no paragraphs`);
      }
      paragraphs.forEach((p, j) => {
        if (!isParagraph(p)) {
          throw new Error(
            `${locale} ${rank} page ${i + 1} paragraph ${j}: a shape the app does not render: ${JSON.stringify(p)}`,
          );
        }
      });
    });
    out[rank] = { format: "flat", pages: g.pages as Page[] };
  }
  return out;
}

type VisualAid = { component: string; props: Record<string, unknown> };

const ENTRY_KEY = /^\s*'([\w-]+:\d+:\d+)':/gm;
const ENTRY =
  /'([\w-]+:\d+:\d+)':\s*<(\w+)((?:\s+\w+=(?:"[^"]*"|\{\[[^\]]*\]\}))*)\s*\/>/g;
const PROP = /(\w+)=(?:"([^"]*)"|\{\[([^\]]*)\]\})/g;

async function readVisualAids(): Promise<Record<string, VisualAid>> {
  const source = await readFile(
    join(GUIDE_LIB, "paragraphVisualAids.tsx"),
    "utf8",
  );
  const map = source.slice(source.indexOf("const VISUAL_AID_MAP"));
  const aids: Record<string, VisualAid> = {};
  for (const [, key, component, rawProps] of map.matchAll(ENTRY)) {
    const props: Record<string, unknown> = {};
    for (const [, name, text, list] of rawProps.matchAll(PROP)) {
      props[name] =
        text ??
        list
          .split(",")
          .map((s) => s.trim().replace(/^'|'$/g, ""))
          .filter(Boolean);
    }
    aids[key] = { component, props };
  }
  const keys = [...map.matchAll(ENTRY_KEY)].map((m) => m[1]);
  const unread = keys.filter((k) => !(k in aids));
  if (unread.length > 0) {
    throw new Error(`visual aids the parser could not read: ${unread}`);
  }
  return aids;
}

type LinkInfo = { label: string; href: string; leadIn?: string };
type GetLink = (
  rank: string,
  page: number,
  index: number,
  locale: string,
  t: (key: string) => string,
) => LinkInfo | null;

function lookup(dict: unknown, path: string): string {
  const value = path
    .split(".")
    .reduce<unknown>(
      (node, key) => (node as Record<string, unknown> | undefined)?.[key],
      dict,
    );
  if (typeof value !== "string") throw new Error(`missing string ${path}`);
  return value;
}

type Curriculum = readonly {
  slug: string;
  sections: readonly { titleKey: string }[];
}[];

async function main() {
  const { CURRICULUM } = (await import(
    pathToFileURL(join(WEB, "lib/db/data/curriculum.ts")).href
  )) as { CURRICULUM: Curriculum };
  const { getGuideInlineLink } = (await import(
    pathToFileURL(join(GUIDE_LIB, "paragraphInlineLinks.ts")).href
  )) as { getGuideInlineLink: GetLink };

  const content: Record<string, unknown> = {};
  for (const locale of LOCALES) {
    const messages = JSON.parse(
      await readFile(join(WEB, `messages/${locale}.json`), "utf8"),
    ) as { guides: Record<string, unknown>; dojo: unknown };
    const g = messages.guides;
    const t = (key: string) => lookup(g, key);
    const guides = readGuides(locale, g.pages as Record<string, unknown>);

    const links: Record<string, LinkInfo> = {};
    for (const [rank, guide] of Object.entries(guides)) {
      guide.pages.forEach((page, i) => {
        page.paragraphs.forEach((_, j) => {
          // The marker stands in for the locale the web prefixes to its
          // hrefs; the app adds its own when it opens a web page.
          const link = getGuideInlineLink(rank, i + 1, j, "__LOCALE__", t);
          if (link) {
            links[`${rank}:${i + 1}:${j}`] = {
              ...link,
              href: link.href.replace(/^\/__LOCALE__/, ""),
            };
          }
        });
      });
    }

    const titles: Record<string, string> = {};
    for (const rank of Object.keys(guides)) {
      const sections =
        CURRICULUM.find((entry) => entry.slug === rank)?.sections ?? [];
      if (sections.length !== 1) {
        throw new Error(
          `${rank}: ${sections.length} curriculum sections — the app lists one row per guide, titled by its one section`,
        );
      }
      titles[rank] = lookup(
        messages.dojo,
        `curriculum.sections.${sections[0]!.titleKey}`,
      );
    }

    content[locale] = {
      guides,
      titles,
      links,
      strings: {
        title: t("top.title"),
        indexTitleWithRank: t("ranks.indexTitleWithRank"),
        prevRank: t("navigation.prevRank"),
        nextRank: t("navigation.nextRank"),
        diagonalTables: {
          start: t("visualAids.diagonalPatternTables.headers.start"),
          end: t("visualAids.diagonalPatternTables.headers.end"),
          aFileStart: t("visualAids.diagonalPatternTables.aFileStart"),
          rank1Start: t("visualAids.diagonalPatternTables.rank1Start"),
          rank8Start: t("visualAids.diagonalPatternTables.rank8Start"),
        },
      },
    };
  }

  const aids = await readVisualAids();
  const names = [...new Set(Object.values(aids).map((a) => a.component))]
    .sort()
    .map((n) => JSON.stringify(n));

  await mkdir(OUT_DIR, { recursive: true });
  const header =
    "// Generated by scripts/bundle-guides.ts from the web app. Do not edit.\n/* eslint-disable */\n";
  await writeFile(
    join(OUT_DIR, "guides.ts"),
    `${header}import type { GuideLocaleContent } from "../types";\n\n` +
      `export const GUIDE_CONTENT: Readonly<Record<${LOCALES.map((l) => JSON.stringify(l)).join(" | ")}, GuideLocaleContent>> = ${JSON.stringify(content, null, 2)};\n`,
  );
  await writeFile(
    join(OUT_DIR, "visual-aids.ts"),
    `${header}import type { GuideVisualAidRef } from "../types";\n\n` +
      `/** The web's visual-aid components the guides use. */\nexport type GuideVisualAidName =\n  | ${names.join("\n  | ")};\n\n` +
      `/** Keyed \`<rank>:<page>:<paragraph>\`, like the links. */\nexport const GUIDE_VISUAL_AIDS: Readonly<Record<string, GuideVisualAidRef<GuideVisualAidName>>> = ${JSON.stringify(aids, null, 2)};\n`,
  );
  console.log(
    `${LOCALES.length} locales, ${Object.keys(aids).length} visual aids (${names.length} kinds)`,
  );
}

void main();
