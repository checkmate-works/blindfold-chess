import type { ChessOpeningSeed } from './_types';

export const openingsAdditionalD4: ChessOpeningSeed[] = [
  // =========================================================================
  // Additional well-known d4 systems
  // =========================================================================
  {
    slug: 'kings-indian-classical',
    name: "King's Indian Defense: Classical Variation",
    ecoCode: 'E92',
    pgn: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. Be2',
    firstMoveSquare: 'd4',
    sortOrder: 701,
    parentSlug: 'kings-indian-defense',
  },
  {
    slug: 'kings-indian-samisch',
    name: "King's Indian Defense: Samisch Variation",
    ecoCode: 'E80',
    pgn: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. f3',
    firstMoveSquare: 'd4',
    sortOrder: 702,
    parentSlug: 'kings-indian-defense',
  },
  {
    slug: 'grunfeld-exchange',
    name: 'Grunfeld Defense: Exchange Variation',
    ecoCode: 'D85',
    pgn: '1. d4 Nf6 2. c4 g6 3. Nc3 d5 4. cxd5 Nxd5 5. e4',
    firstMoveSquare: 'd4',
    sortOrder: 731,
    parentSlug: 'grunfeld-defense',
  },
];
