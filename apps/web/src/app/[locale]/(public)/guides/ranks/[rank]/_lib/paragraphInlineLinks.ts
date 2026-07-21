/**
 * Paragraph-level inline link registry for rank guide pages.
 *
 * Keyed on `(rankSlug, pageNumber, paragraphIndex)` — the same coordinate
 * space used by {@link getVisualAid} in `./paragraphVisualAids.tsx`. The two
 * files are deliberately kept separate (one owns link cards, the other owns
 * board/visual components) but the parallel naming signals that they are
 * both indexed by the same identifier tuple.
 *
 * Adding a new inline link: pick the `(rank, page, paragraph)` coordinates,
 * add an entry to `GUIDE_LINK_MAP`, and make sure the label and (optional)
 * `leadIn` text exist under `guides.inlineLinks.<rank>.*` in every locale.
 */
import type { RankSlug } from '@/lib/db/data/ranks';

import { TWO_PAWNS_VS_ONE_FEN } from '@/app/[locale]/(public)/dojo/ranks/_components/two-pawns-vs-one-fen';

type GuideLinkKey = `${RankSlug}:${number}:${number}`;

type GuideLinkEntry = {
  /** i18n sub-key under guides.inlineLinks.<inlineLinkKey> */
  inlineLinkKey: RankSlug;
  labelKey: string;
  /** Path suffix appended to /<locale>/ */
  href: string;
  /** Optional i18n sub-key for a lead-in paragraph shown before the card. */
  leadInKey?: string;
};

/**
 * Maps (rankSlug, pageNumber, paragraphIndex) to a guide link entry
 * rendered after that paragraph.
 */
const GUIDE_LINK_MAP: Partial<Record<GuideLinkKey, GuideLinkEntry>> = {
  // 3kyu guide - Diagonal quiz tutorial (page 1, paragraph index 1)
  '3kyu:1:1': {
    inlineLinkKey: '3kyu',
    labelKey: 'diagonalQuizTutorialLabel',
    href: 'practice/diagonal-quiz/tutorial',
  },
  // 3kyu guide - Diagonal quiz practice (page 8, paragraph index 1)
  '3kyu:8:1': {
    inlineLinkKey: '3kyu',
    labelKey: 'diagonalQuizLabel',
    href: 'practice/diagonal-quiz',
  },
  // 5kyu guide - Quadrant method article (page 2, last paragraph index 9)
  '5kyu:2:9': {
    inlineLinkKey: '5kyu',
    labelKey: 'quadrantMethodArticleLabel',
    href: 'articles/switched-to-quadrant-method',
  },
  // 4kyu guide - King (page 1, last paragraph index 6)
  '4kyu:1:6': {
    inlineLinkKey: '4kyu',
    labelKey: 'kingMovementLabel',
    href: 'learn/moves/king-movement',
  },
  // 4kyu guide - Knight (page 2, last paragraph index 4)
  '4kyu:2:4': {
    inlineLinkKey: '4kyu',
    labelKey: 'knightMovementLabel',
    href: 'learn/moves/knight-movement',
  },
  // 4kyu guide - Bishop (page 3, last paragraph index 3)
  '4kyu:3:3': {
    inlineLinkKey: '4kyu',
    labelKey: 'bishopMovementLabel',
    href: 'learn/moves/bishop-movement',
  },
  // 4kyu guide - Rook (page 4, paragraph index 0)
  '4kyu:4:0': {
    inlineLinkKey: '4kyu',
    labelKey: 'rookMovementLabel',
    href: 'learn/moves/rook-movement',
  },
  // Mukyu guide - Learn about algebraic notation (page 1, paragraph 3)
  'mukyu:1:3': {
    inlineLinkKey: 'mukyu',
    labelKey: 'learnArticleLabel',
    href: 'learn/notation/algebraic-notation',
    leadInKey: 'learnArticle',
  },
  // Mukyu guide - Coordinate quiz (page 2, paragraph 1)
  'mukyu:2:1': {
    inlineLinkKey: 'mukyu',
    labelKey: 'coordinateQuizLabel',
    href: 'practice/coordinate-quiz',
  },
  // Mukyu guide - Coordinate confusion article (page 2, paragraph 3)
  'mukyu:2:3': {
    inlineLinkKey: 'mukyu',
    labelKey: 'coordinateConfusionLabel',
    href: 'learn/coordinates/coordinate-confusion',
  },
  // Mukyu guide - Quadrants practice (page 3, paragraph 0)
  'mukyu:3:0': {
    inlineLinkKey: 'mukyu',
    labelKey: 'quadrantsLabel',
    href: 'practice/quadrants',
  },
  // Mukyu guide - 5kyu guide link (page 3, paragraph 2)
  'mukyu:3:2': {
    inlineLinkKey: 'mukyu',
    labelKey: '5kyuGuideLabel',
    href: 'guides/ranks/5kyu',
  },
  // 2kyu guide - Position memory tutorial (page 1, paragraph 1)
  '2kyu:1:1': {
    inlineLinkKey: '2kyu',
    labelKey: 'positionMemoryTutorialLabel',
    href: 'practice/position-memory/tutorial',
  },
  // 2kyu guide - "solve this problem" CTA, rendered under the ScatteredPawnsBoard
  // visual aid on page 1, paragraph 3. The token is the Base64URL encoding of
  // SCATTERED_PAWNS_FEN ('8/4PP1p/2p5/P3p3/7P/P7/3Pp3/8 w - - 0 1'); a test in
  // paragraphInlineLinks.test.ts pins this against the live FEN to catch drift.
  '2kyu:1:3': {
    inlineLinkKey: '2kyu',
    labelKey: 'solveProblemLabel',
    href: 'practice/position-memory/custom/OC80UFAxcC8ycDUvUDNwMy83UC9QNy8zUHAzLzggdyAtIC0gMCAx',
  },
  // 2kyu guide - Position memory article (page 2, paragraph 1)
  '2kyu:2:1': {
    inlineLinkKey: '2kyu',
    labelKey: 'positionMemoryArticleLabel',
    href: 'learn/memory/position-memory',
  },
  // 2kyu guide - "solve this problem" CTA under the both-castled board (page 2,
  // paragraph 3). Token is the Base64URL of CASTLED_KINGSIDE_FEN
  // ('5rk1/5ppp/8/8/8/8/5PPP/5RK1 w - - 0 1'); pinned by a drift test.
  '2kyu:2:3': {
    inlineLinkKey: '2kyu',
    labelKey: 'solveProblemLabel',
    href: 'practice/position-memory/custom/NXJrMS81cHBwLzgvOC84LzgvNVBQUC81UksxIHcgLSAtIDAgMQ',
  },
  // 2kyu guide - de Groot chess-memory experiment article (page 3, paragraph 3)
  '2kyu:3:3': {
    inlineLinkKey: '2kyu',
    labelKey: 'deGrootExperimentLabel',
    href: 'learn/memory/de-groot-experiment',
  },
  // 1kyu guide - Kata catalog (page 1, paragraph 6 — the "so here's a feature
  // for it" hand-off; the two paragraphs after the card describe it).
  '1kyu:1:6': {
    inlineLinkKey: '1kyu',
    labelKey: 'repertoiresLabel',
    href: 'repertoires',
  },
  // 1kyu guide - page 3, start an AI game from the 2-vs-1 pawn endgame. The
  // position editor pre-fills itself from `?fen=` (plain percent-encoded, not
  // the Base64URL token position-memory uses), the same way getting-started and
  // the position-memory/puzzle pages link into it. Built from the constant
  // rather than a pasted string, so the href cannot drift from the FEN.
  '1kyu:3:1': {
    inlineLinkKey: '1kyu',
    labelKey: 'newGameFromPositionLabel',
    href: `games/new/position?fen=${encodeURIComponent(TWO_PAWNS_VS_ONE_FEN)}`,
  },
  // 2kyu guide - Chunks list (page 4, paragraph 1)
  '2kyu:4:1': {
    inlineLinkKey: '2kyu',
    labelKey: 'chunksLabel',
    href: 'chunks',
  },
  // 2kyu guide - Submit a chunk (page 4, paragraph 3)
  '2kyu:4:3': {
    inlineLinkKey: '2kyu',
    labelKey: 'chunksNewLabel',
    href: 'chunks/new',
  },
};

export type GuideLinkInfo = {
  label: string;
  href: string;
  leadIn?: string;
};

export function getGuideInlineLink(
  rankSlug: RankSlug,
  pageNumber: number,
  paragraphIndex: number,
  locale: string,
  tGuides: (key: string) => string
): GuideLinkInfo | null {
  const key: GuideLinkKey = `${rankSlug}:${pageNumber}:${paragraphIndex}`;
  const entry = GUIDE_LINK_MAP[key];
  if (!entry) return null;

  return {
    label: tGuides(`inlineLinks.${entry.inlineLinkKey}.${entry.labelKey}`),
    href: `/${locale}/${entry.href}`,
    leadIn: entry.leadInKey
      ? tGuides(`inlineLinks.${entry.inlineLinkKey}.${entry.leadInKey}`)
      : undefined,
  };
}
