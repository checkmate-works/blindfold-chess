import {
  RANK_SLUGS,
  type RankSlug,
} from "@blindfold-chess/features/dojo-ranks";

import { validateFen } from "@blindfold-chess/features/chess-core";
import { validateFenFormat } from "@blindfold-chess/features/chess-core/fen";

import { guideProblemSessionParams } from "../fen/lib/route-params";
import {
  MOBILE_PRACTICE_MODULES,
  practiceModuleRoute,
} from "../../navigation/practice-modules";
import { GLOSSARY_TERMS } from "../glossary/generated/terms";
import { LEARN_ARTICLES } from "../learn/generated/articles";
import { GUIDE_CONTENT } from "./generated/guides";
import type { FlatGuide, GuideLocaleContent, GuideParagraph } from "./types";

type GuideLocale = keyof typeof GUIDE_CONTENT;

/**
 * The guides in the app's language: the exact tag, then its language
 * (`pt` → `pt-BR`), then English.
 */
export function guideContent(language: string): GuideLocaleContent {
  const base = language.split("-")[0];
  const locale =
    (Object.keys(GUIDE_CONTENT) as GuideLocale[]).find((l) => l === language) ??
    (Object.keys(GUIDE_CONTENT) as GuideLocale[]).find(
      (l) => l.split("-")[0] === base,
    ) ??
    "en";
  return GUIDE_CONTENT[locale];
}

/**
 * The ranks with a guide, in ladder order. Read from the English copy: the
 * web's dictionaries share their key sets (a parity test there), so every
 * language has the same guides.
 */
export const GUIDE_RANKS: readonly RankSlug[] = RANK_SLUGS.filter(
  (slug) => slug in GUIDE_CONTENT.en.guides,
);

export function hasGuide(slug: RankSlug): boolean {
  return GUIDE_RANKS.includes(slug);
}

export function guideFor(
  slug: RankSlug,
  language: string,
): FlatGuide | undefined {
  return guideContent(language).guides[slug];
}

/**
 * The guided ranks either side of `slug` on the ladder, skipping ranks
 * without a guide, as the web's "previous / next rank's guide" links do.
 */
export function adjacentGuideRanks(slug: RankSlug): {
  prev?: RankSlug;
  next?: RankSlug;
} {
  const index = GUIDE_RANKS.indexOf(slug);
  if (index === -1) return {};
  return { prev: GUIDE_RANKS[index - 1], next: GUIDE_RANKS[index + 1] };
}

/**
 * Fills a web message's `{name}` placeholders and drops its rich-text tags
 * (`<link>…</link>` keeps its text): the app's headers and rows are plain
 * text, so the web's in-heading link to the rank page has no place there.
 */
export function formatWebMessage(
  template: string,
  values: Readonly<Record<string, string>>,
): string {
  return template
    .replace(/<\/?\w+>/g, "")
    .replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
}

export type ParagraphKind = "text" | "heading" | "list";

/** Which of the three block shapes a paragraph is; `null` for anything else. */
export function paragraphKind(paragraph: unknown): ParagraphKind | null {
  if (typeof paragraph === "string") return "text";
  if (typeof paragraph !== "object" || paragraph === null) return null;
  const p = paragraph as Record<string, unknown>;
  if (typeof p.heading === "string" && typeof p.body === "string") {
    return "heading";
  }
  if (Array.isArray(p.items) && p.items.every((i) => typeof i === "string")) {
    return "list";
  }
  return null;
}

/** Every string of prose a paragraph holds, for the term scan and tests. */
export function paragraphTexts(paragraph: GuideParagraph): readonly string[] {
  if (typeof paragraph === "string") return [paragraph];
  if ("items" in paragraph) return paragraph.items;
  return [paragraph.heading, paragraph.body];
}

export type ProseSegment =
  | { readonly type: "text"; readonly value: string }
  | { readonly type: "term"; readonly slug: string; readonly label: string };

const TERM_MARKUP = /\[\[([^[\]|]+?)(?:\|([^[\]]+?))?\]\]/g;
const GLOSSARY_SLUGS = new Set(GLOSSARY_TERMS.map((term) => term.slug));

/**
 * Splits prose on the web's glossary markup, `[[slug|label]]` (or
 * `[[slug]]`). A term the bundled glossary has becomes a `term` segment;
 * one it lacks reads as its label, as the web shows a term its database
 * does not resolve.
 */
export function parseProse(text: string): ProseSegment[] {
  const segments: ProseSegment[] = [];
  let last = 0;
  const push = (value: string) => {
    if (value === "") return;
    const prev = segments[segments.length - 1];
    if (prev?.type === "text") {
      segments[segments.length - 1] = {
        type: "text",
        value: prev.value + value,
      };
    } else {
      segments.push({ type: "text", value });
    }
  };
  for (const match of text.matchAll(TERM_MARKUP)) {
    const slug = match[1].trim();
    const label = (match[2] ?? match[1]).trim();
    push(text.slice(last, match.index));
    if (GLOSSARY_SLUGS.has(slug)) {
      segments.push({ type: "term", slug, label });
    } else {
      push(label);
    }
    last = match.index + match[0].length;
  }
  push(text.slice(last));
  return segments;
}

/**
 * Where a guide's link card goes: a screen of the app when the app has the
 * page — a learn article it bundles, a practice's setup screen, another
 * guide, a position-memory problem, an AI game from a position — otherwise
 * the web page.
 */
export type GuideLinkTarget =
  | { readonly kind: "app"; readonly href: string }
  | { readonly kind: "web"; readonly path: string };

export function guideLinkTarget(path: string): GuideLinkTarget {
  const [pathname, query = ""] = path.split("?");
  const segments = pathname.split("/").filter(Boolean);
  const [section, first, second, ...rest] = segments;

  // The web's instant problem (`/practice/position-memory/custom/<token>`):
  // the guide's position, Base64URL-encoded. The app plays it as a session
  // of that one problem, opened over the guide so closing it returns there.
  if (
    section === "practice" &&
    first === "position-memory" &&
    second === "custom" &&
    rest.length === 1
  ) {
    const fen = decodeFenFromBase64Url(rest[0]);
    if (fen && validateFenFormat(fen)) {
      return { kind: "app", href: guidePositionMemoryHref(fen) };
    }
  }
  // The web's "new game from a position" (`/games/new/position?fen=`): the
  // AI-game setup with that starting position.
  if (section === "games" && first === "new" && second === "position") {
    const fen = new URLSearchParams(query).get("fen");
    if (rest.length === 0 && fen && validateFen(fen)) {
      return {
        kind: "app",
        href: `/play/ai-game?${new URLSearchParams({ fen }).toString()}`,
      };
    }
  }

  if (section === "learn" && second !== undefined && rest.length === 0) {
    if (LEARN_ARTICLES.some((article) => article.slug === second)) {
      return { kind: "app", href: `/learn/${second}` };
    }
  }
  if (section === "practice" && first !== undefined && second === undefined) {
    const module = MOBILE_PRACTICE_MODULES.find(
      (m) => practiceModuleRoute(m) === first || m.slug === first,
    );
    if (module) {
      return { kind: "app", href: `/practice/${practiceModuleRoute(module)}` };
    }
  }
  if (
    section === "dojo" &&
    first === "guides" &&
    second !== undefined &&
    rest.length === 0 &&
    (GUIDE_RANKS as readonly string[]).includes(second)
  ) {
    return { kind: "app", href: `/dojo/guides/${second}` };
  }
  return { kind: "web", path };
}

/**
 * The position-memory session for one guide problem. `from=guide` makes its
 * result lead back to the guide rather than to the practice's setup, which
 * is not underneath the session.
 */
function guidePositionMemoryHref(fen: string): string {
  const params = new URLSearchParams(guideProblemSessionParams([fen]));
  return `/practice/position-memory/session?${params.toString()}`;
}

/**
 * The FEN in a web instant-problem token: Base64URL without padding, as the
 * web's `encodeFenToBase64Url` writes it. `null` for anything that does not
 * decode; the caller still validates the FEN.
 */
export function decodeFenFromBase64Url(token: string): string | null {
  // A FEN is under 100 characters; a longer token is not one of the web's.
  if (token.length === 0 || token.length > 256) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(token)) return null;
  try {
    const base64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(padded);
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}
