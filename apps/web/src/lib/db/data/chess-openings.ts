/**
 * Chess opening families seed data.
 *
 * Each entry contains the PGN and slug; the FEN is computed at seed time
 * via chess-core's getFenAfterMoves / parsePgn to keep this file free of
 * derived data that could drift from the PGN.
 *
 * Sources: ECO classification, lichess-org/chess-openings
 */

export type ChessOpeningSeed = {
  slug: string;
  name: string;
  ecoCode: string;
  pgn: string;
  firstMoveSquare: string;
  sortOrder: number;
};

export const chessOpenings: ChessOpeningSeed[] = [
  // =========================================================================
  // 1. e4 — Open Games & Semi-Open Defenses
  // =========================================================================

  // 1. e4 e5 — Open Games
  {
    slug: 'ruy-lopez',
    name: 'Ruy Lopez',
    ecoCode: 'C60',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5',
    firstMoveSquare: 'e4',
    sortOrder: 100,
  },
  {
    slug: 'italian-game',
    name: 'Italian Game',
    ecoCode: 'C50',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
    firstMoveSquare: 'e4',
    sortOrder: 110,
  },
  {
    slug: 'scotch-game',
    name: 'Scotch Game',
    ecoCode: 'C44',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. d4',
    firstMoveSquare: 'e4',
    sortOrder: 120,
  },
  {
    slug: 'petrovs-defense',
    name: "Petrov's Defense",
    ecoCode: 'C42',
    pgn: '1. e4 e5 2. Nf3 Nf6',
    firstMoveSquare: 'e4',
    sortOrder: 130,
  },
  {
    slug: 'kings-gambit',
    name: "King's Gambit",
    ecoCode: 'C30',
    pgn: '1. e4 e5 2. f4',
    firstMoveSquare: 'e4',
    sortOrder: 140,
  },
  {
    slug: 'vienna-game',
    name: 'Vienna Game',
    ecoCode: 'C25',
    pgn: '1. e4 e5 2. Nc3',
    firstMoveSquare: 'e4',
    sortOrder: 150,
  },
  {
    slug: 'four-knights-game',
    name: 'Four Knights Game',
    ecoCode: 'C46',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Nc3 Nf6',
    firstMoveSquare: 'e4',
    sortOrder: 160,
  },
  {
    slug: 'bishops-opening',
    name: "Bishop's Opening",
    ecoCode: 'C23',
    pgn: '1. e4 e5 2. Bc4',
    firstMoveSquare: 'e4',
    sortOrder: 170,
  },
  {
    slug: 'philidor-defense',
    name: 'Philidor Defense',
    ecoCode: 'C41',
    pgn: '1. e4 e5 2. Nf3 d6',
    firstMoveSquare: 'e4',
    sortOrder: 180,
  },
  {
    slug: 'evans-gambit',
    name: 'Evans Gambit',
    ecoCode: 'C51',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4',
    firstMoveSquare: 'e4',
    sortOrder: 190,
  },
  {
    slug: 'center-game',
    name: 'Center Game',
    ecoCode: 'C21',
    pgn: '1. e4 e5 2. d4',
    firstMoveSquare: 'e4',
    sortOrder: 200,
  },
  {
    slug: 'giuoco-piano',
    name: 'Giuoco Piano',
    ecoCode: 'C53',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5',
    firstMoveSquare: 'e4',
    sortOrder: 210,
  },
  {
    slug: 'two-knights-defense',
    name: 'Two Knights Defense',
    ecoCode: 'C55',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6',
    firstMoveSquare: 'e4',
    sortOrder: 220,
  },

  // 1. e4 — Semi-Open Defenses
  {
    slug: 'sicilian-defense',
    name: 'Sicilian Defense',
    ecoCode: 'B20',
    pgn: '1. e4 c5',
    firstMoveSquare: 'e4',
    sortOrder: 300,
  },
  {
    slug: 'french-defense',
    name: 'French Defense',
    ecoCode: 'C00',
    pgn: '1. e4 e6',
    firstMoveSquare: 'e4',
    sortOrder: 310,
  },
  {
    slug: 'caro-kann-defense',
    name: 'Caro-Kann Defense',
    ecoCode: 'B10',
    pgn: '1. e4 c6',
    firstMoveSquare: 'e4',
    sortOrder: 320,
  },
  {
    slug: 'pirc-defense',
    name: 'Pirc Defense',
    ecoCode: 'B07',
    pgn: '1. e4 d6',
    firstMoveSquare: 'e4',
    sortOrder: 330,
  },
  {
    slug: 'alekhines-defense',
    name: "Alekhine's Defense",
    ecoCode: 'B02',
    pgn: '1. e4 Nf6',
    firstMoveSquare: 'e4',
    sortOrder: 340,
  },
  {
    slug: 'scandinavian-defense',
    name: 'Scandinavian Defense',
    ecoCode: 'B01',
    pgn: '1. e4 d5',
    firstMoveSquare: 'e4',
    sortOrder: 350,
  },
  {
    slug: 'modern-defense',
    name: 'Modern Defense',
    ecoCode: 'B06',
    pgn: '1. e4 g6',
    firstMoveSquare: 'e4',
    sortOrder: 360,
  },
  {
    slug: 'nimzowitsch-defense',
    name: 'Nimzowitsch Defense',
    ecoCode: 'B00',
    pgn: '1. e4 Nc6',
    firstMoveSquare: 'e4',
    sortOrder: 370,
  },
  {
    slug: 'owens-defense',
    name: "Owen's Defense",
    ecoCode: 'B00',
    pgn: '1. e4 b6',
    firstMoveSquare: 'e4',
    sortOrder: 380,
  },
  {
    slug: 'st-george-defense',
    name: 'St. George Defense',
    ecoCode: 'B00',
    pgn: '1. e4 a6',
    firstMoveSquare: 'e4',
    sortOrder: 390,
  },

  // =========================================================================
  // 1. d4 — Closed Games & Indian Defenses
  // =========================================================================

  // 1. d4 d5 — Closed Games
  {
    slug: 'queens-gambit',
    name: "Queen's Gambit",
    ecoCode: 'D06',
    pgn: '1. d4 d5 2. c4',
    firstMoveSquare: 'd4',
    sortOrder: 500,
  },
  {
    slug: 'queens-gambit-declined',
    name: "Queen's Gambit Declined",
    ecoCode: 'D30',
    pgn: '1. d4 d5 2. c4 e6',
    firstMoveSquare: 'd4',
    sortOrder: 510,
  },
  {
    slug: 'queens-gambit-accepted',
    name: "Queen's Gambit Accepted",
    ecoCode: 'D20',
    pgn: '1. d4 d5 2. c4 dxc4',
    firstMoveSquare: 'd4',
    sortOrder: 520,
  },
  {
    slug: 'slav-defense',
    name: 'Slav Defense',
    ecoCode: 'D10',
    pgn: '1. d4 d5 2. c4 c6',
    firstMoveSquare: 'd4',
    sortOrder: 530,
  },
  {
    slug: 'semi-slav-defense',
    name: 'Semi-Slav Defense',
    ecoCode: 'D43',
    pgn: '1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. Nc3 e6',
    firstMoveSquare: 'd4',
    sortOrder: 540,
  },
  {
    slug: 'london-system',
    name: 'London System',
    ecoCode: 'D00',
    pgn: '1. d4 d5 2. Bf4',
    firstMoveSquare: 'd4',
    sortOrder: 550,
  },
  {
    slug: 'colle-system',
    name: 'Colle System',
    ecoCode: 'D05',
    pgn: '1. d4 d5 2. Nf3 Nf6 3. e3',
    firstMoveSquare: 'd4',
    sortOrder: 560,
  },
  {
    slug: 'torre-attack',
    name: 'Torre Attack',
    ecoCode: 'D03',
    pgn: '1. d4 d5 2. Nf3 Nf6 3. Bg5',
    firstMoveSquare: 'd4',
    sortOrder: 570,
  },
  {
    slug: 'blackmar-diemer-gambit',
    name: 'Blackmar-Diemer Gambit',
    ecoCode: 'D00',
    pgn: '1. d4 d5 2. e4',
    firstMoveSquare: 'd4',
    sortOrder: 580,
  },
  {
    slug: 'stonewall-attack',
    name: 'Stonewall Attack',
    ecoCode: 'D00',
    pgn: '1. d4 d5 2. e3 Nf6 3. Bd3 c5 4. c3 Nc6 5. f4',
    firstMoveSquare: 'd4',
    sortOrder: 590,
  },
  {
    slug: 'chigorin-defense',
    name: 'Chigorin Defense',
    ecoCode: 'D07',
    pgn: '1. d4 d5 2. c4 Nc6',
    firstMoveSquare: 'd4',
    sortOrder: 600,
  },
  {
    slug: 'albin-countergambit',
    name: 'Albin Countergambit',
    ecoCode: 'D08',
    pgn: '1. d4 d5 2. c4 e5',
    firstMoveSquare: 'd4',
    sortOrder: 610,
  },
  {
    slug: 'tarrasch-defense',
    name: 'Tarrasch Defense',
    ecoCode: 'D32',
    pgn: '1. d4 d5 2. c4 e6 3. Nc3 c5',
    firstMoveSquare: 'd4',
    sortOrder: 620,
  },

  // 1. d4 Nf6 — Indian Defenses
  {
    slug: 'kings-indian-defense',
    name: "King's Indian Defense",
    ecoCode: 'E60',
    pgn: '1. d4 Nf6 2. c4 g6',
    firstMoveSquare: 'd4',
    sortOrder: 700,
  },
  {
    slug: 'nimzo-indian-defense',
    name: 'Nimzo-Indian Defense',
    ecoCode: 'E20',
    pgn: '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4',
    firstMoveSquare: 'd4',
    sortOrder: 710,
  },
  {
    slug: 'queens-indian-defense',
    name: "Queen's Indian Defense",
    ecoCode: 'E12',
    pgn: '1. d4 Nf6 2. c4 e6 3. Nf3 b6',
    firstMoveSquare: 'd4',
    sortOrder: 720,
  },
  {
    slug: 'grunfeld-defense',
    name: 'Grunfeld Defense',
    ecoCode: 'D70',
    pgn: '1. d4 Nf6 2. c4 g6 3. Nc3 d5',
    firstMoveSquare: 'd4',
    sortOrder: 730,
  },
  {
    slug: 'catalan-opening',
    name: 'Catalan Opening',
    ecoCode: 'E01',
    pgn: '1. d4 Nf6 2. c4 e6 3. g3',
    firstMoveSquare: 'd4',
    sortOrder: 740,
  },
  {
    slug: 'benoni-defense',
    name: 'Benoni Defense',
    ecoCode: 'A60',
    pgn: '1. d4 Nf6 2. c4 c5',
    firstMoveSquare: 'd4',
    sortOrder: 750,
  },
  {
    slug: 'bogo-indian-defense',
    name: 'Bogo-Indian Defense',
    ecoCode: 'E11',
    pgn: '1. d4 Nf6 2. c4 e6 3. Nf3 Bb4+',
    firstMoveSquare: 'd4',
    sortOrder: 760,
  },
  {
    slug: 'old-indian-defense',
    name: 'Old Indian Defense',
    ecoCode: 'A53',
    pgn: '1. d4 Nf6 2. c4 d6',
    firstMoveSquare: 'd4',
    sortOrder: 770,
  },
  {
    slug: 'budapest-gambit',
    name: 'Budapest Gambit',
    ecoCode: 'A51',
    pgn: '1. d4 Nf6 2. c4 e5',
    firstMoveSquare: 'd4',
    sortOrder: 780,
  },
  {
    slug: 'benko-gambit',
    name: 'Benko Gambit',
    ecoCode: 'A57',
    pgn: '1. d4 Nf6 2. c4 c5 3. d5 b5',
    firstMoveSquare: 'd4',
    sortOrder: 790,
  },

  // 1. d4 — Other Defenses
  {
    slug: 'dutch-defense',
    name: 'Dutch Defense',
    ecoCode: 'A80',
    pgn: '1. d4 f5',
    firstMoveSquare: 'd4',
    sortOrder: 800,
  },
  {
    slug: 'trompowsky-attack',
    name: 'Trompowsky Attack',
    ecoCode: 'A45',
    pgn: '1. d4 Nf6 2. Bg5',
    firstMoveSquare: 'd4',
    sortOrder: 810,
  },
  {
    slug: 'veresov-opening',
    name: 'Veresov Opening',
    ecoCode: 'D01',
    pgn: '1. d4 d5 2. Nc3 Nf6 3. Bg5',
    firstMoveSquare: 'd4',
    sortOrder: 820,
  },
  {
    slug: 'richter-veresov-attack',
    name: 'Richter-Veresov Attack',
    ecoCode: 'D01',
    pgn: '1. d4 Nf6 2. Nc3 d5 3. Bg5',
    firstMoveSquare: 'd4',
    sortOrder: 830,
  },

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
  },
  {
    slug: 'english-opening-reversed-sicilian',
    name: 'English Opening: Reversed Sicilian',
    ecoCode: 'A20',
    pgn: '1. c4 e5',
    firstMoveSquare: 'c4',
    sortOrder: 920,
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

  // =========================================================================
  // Additional well-known e4 systems
  // =========================================================================
  {
    slug: 'sicilian-najdorf',
    name: 'Sicilian Defense: Najdorf Variation',
    ecoCode: 'B90',
    pgn: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6',
    firstMoveSquare: 'e4',
    sortOrder: 301,
  },
  {
    slug: 'sicilian-dragon',
    name: 'Sicilian Defense: Dragon Variation',
    ecoCode: 'B70',
    pgn: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6',
    firstMoveSquare: 'e4',
    sortOrder: 302,
  },
  {
    slug: 'sicilian-scheveningen',
    name: 'Sicilian Defense: Scheveningen Variation',
    ecoCode: 'B80',
    pgn: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 e6',
    firstMoveSquare: 'e4',
    sortOrder: 303,
  },
  {
    slug: 'sicilian-sveshnikov',
    name: 'Sicilian Defense: Sveshnikov Variation',
    ecoCode: 'B33',
    pgn: '1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 e5',
    firstMoveSquare: 'e4',
    sortOrder: 304,
  },
  {
    slug: 'french-winawer',
    name: 'French Defense: Winawer Variation',
    ecoCode: 'C15',
    pgn: '1. e4 e6 2. d4 d5 3. Nc3 Bb4',
    firstMoveSquare: 'e4',
    sortOrder: 311,
  },
  {
    slug: 'french-tarrasch',
    name: 'French Defense: Tarrasch Variation',
    ecoCode: 'C03',
    pgn: '1. e4 e6 2. d4 d5 3. Nd2',
    firstMoveSquare: 'e4',
    sortOrder: 312,
  },
  {
    slug: 'french-advance',
    name: 'French Defense: Advance Variation',
    ecoCode: 'C02',
    pgn: '1. e4 e6 2. d4 d5 3. e5',
    firstMoveSquare: 'e4',
    sortOrder: 313,
  },
  {
    slug: 'caro-kann-advance',
    name: 'Caro-Kann Defense: Advance Variation',
    ecoCode: 'B12',
    pgn: '1. e4 c6 2. d4 d5 3. e5',
    firstMoveSquare: 'e4',
    sortOrder: 321,
  },
  {
    slug: 'caro-kann-classical',
    name: 'Caro-Kann Defense: Classical Variation',
    ecoCode: 'B18',
    pgn: '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5',
    firstMoveSquare: 'e4',
    sortOrder: 322,
  },

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
  },
  {
    slug: 'kings-indian-samisch',
    name: "King's Indian Defense: Samisch Variation",
    ecoCode: 'E80',
    pgn: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. f3',
    firstMoveSquare: 'd4',
    sortOrder: 702,
  },
  {
    slug: 'grunfeld-exchange',
    name: 'Grunfeld Defense: Exchange Variation',
    ecoCode: 'D85',
    pgn: '1. d4 Nf6 2. c4 g6 3. Nc3 d5 4. cxd5 Nxd5 5. e4',
    firstMoveSquare: 'd4',
    sortOrder: 731,
  },
];
