import type { ChessOpeningSeed } from './_types';

export const openingsFlank: ChessOpeningSeed[] = [
  // =========================================================================
  // 1. c4 — English Opening
  // =========================================================================
  {
    slug: 'english-opening',
    name: 'English Opening',
    ecoCode: 'A10',
    pgn: '1. c4',
    firstMoveSquare: 'c4',
    sortOrder: 900,
  },
  {
    slug: 'english-opening-symmetrical',
    name: 'English Opening: Symmetrical Variation',
    ecoCode: 'A30',
    pgn: '1. c4 c5',
    firstMoveSquare: 'c4',
    sortOrder: 910,
    parentSlug: 'english-opening',
  },
  {
    slug: 'english-opening-reversed-sicilian',
    name: 'English Opening: Reversed Sicilian',
    ecoCode: 'A20',
    pgn: '1. c4 e5',
    firstMoveSquare: 'c4',
    sortOrder: 920,
    parentSlug: 'english-opening',
  },

  // =========================================================================
  // 1. Nf3 — Reti & Related
  // =========================================================================
  {
    slug: 'reti-opening',
    name: 'Reti Opening',
    ecoCode: 'A04',
    pgn: '1. Nf3',
    firstMoveSquare: 'f3',
    sortOrder: 1000,
  },
  {
    slug: 'kings-indian-attack',
    name: "King's Indian Attack",
    ecoCode: 'A07',
    pgn: '1. Nf3 d5 2. g3',
    firstMoveSquare: 'f3',
    sortOrder: 1010,
  },

  // =========================================================================
  // 1. f4 — Bird's Opening
  // =========================================================================
  {
    slug: 'birds-opening',
    name: "Bird's Opening",
    ecoCode: 'A02',
    pgn: '1. f4',
    firstMoveSquare: 'f4',
    sortOrder: 1100,
  },
  {
    slug: 'birds-opening-dutch-variation',
    name: "Bird's Opening: Dutch Variation",
    ecoCode: 'A03',
    pgn: '1. f4 d5',
    firstMoveSquare: 'f4',
    sortOrder: 1110,
    parentSlug: 'birds-opening',
  },

  // =========================================================================
  // 1. b3 — Larsen's Opening
  // =========================================================================
  {
    slug: 'larsens-opening',
    name: "Larsen's Opening",
    ecoCode: 'A01',
    pgn: '1. b3',
    firstMoveSquare: 'b3',
    sortOrder: 1200,
  },

  // =========================================================================
  // 1. g3 — King's Fianchetto Opening
  // =========================================================================
  {
    slug: 'kings-fianchetto-opening',
    name: "King's Fianchetto Opening",
    ecoCode: 'A00',
    pgn: '1. g3',
    firstMoveSquare: 'g3',
    sortOrder: 1300,
  },

  // =========================================================================
  // 1. b4 — Sokolsky Opening (Polish Opening)
  // =========================================================================
  {
    slug: 'sokolsky-opening',
    name: 'Sokolsky Opening',
    ecoCode: 'A00',
    pgn: '1. b4',
    firstMoveSquare: 'b4',
    sortOrder: 1400,
  },

  // =========================================================================
  // 1. g4 — Grob Opening
  // =========================================================================
  {
    slug: 'grob-opening',
    name: 'Grob Opening',
    ecoCode: 'A00',
    pgn: '1. g4',
    firstMoveSquare: 'g4',
    sortOrder: 1500,
  },
];
