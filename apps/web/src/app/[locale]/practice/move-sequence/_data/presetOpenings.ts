export type PresetOpening = {
  id: string;
  title: string;
  fen: string;
  pgn: string;
};

export const presetOpenings: PresetOpening[] = [
  {
    id: 'italian-game',
    title: 'Italian Game',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
  },
  {
    id: 'sicilian-defense',
    title: 'Sicilian Defense',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    pgn: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4',
  },
  {
    id: 'queens-gambit',
    title: "Queen's Gambit",
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    pgn: '1. d4 d5 2. c4 e6 3. Nc3 Nf6',
  },
  {
    id: 'french-defense',
    title: 'French Defense',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    pgn: '1. e4 e6 2. d4 d5 3. Nc3 Nf6',
  },
  {
    id: 'ruy-lopez',
    title: 'Ruy Lopez',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4',
  },
];
