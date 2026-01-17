// FEN positions for position memory practice - from simple to complex
export const FEN_STRINGS = [
  // Minimal pieces (2-3 pieces)
  '4k3/8/8/8/8/8/4p3/K7 w - - 0 1',
  '8/8/6q1/7q/5K2/8/4k3/8 b - - 3 77',

  // Few pieces (4-5 pieces)
  '8/3R4/8/8/2k2Q2/P7/8/7K b - - 4 49',
  '8/3P4/7k/5pp1/8/4P1KP/5P2/8 b - - 0 53',
  '8/7p/4p1p1/8/p2P1Pk1/PbK5/7B/8 w - - 0 49',

  // Medium complexity (6-8 pieces)
  '1R6/P4ppk/4p2p/3pP3/1P6/5P1P/2r2r2/R4K2 w - - 6 36',
  '5k2/5ppp/p1p3n1/3pPp2/Q7/P6P/1r4q1/R3R2K w - - 0 25',
  '8/p4ppk/6qp/8/5P1n/P3P2Q/6rP/1R2R2K b - - 1 32',

  // Higher complexity (9+ pieces)
  '2Q5/1B1k3p/3P2p1/4Pp2/5P2/1b6/5P1P/6K1 b - - 0 38',
  'r1bqk1nr/ppp1bppp/2n5/1P2P3/2Pp4/P4N2/3BPPPP/RN1QKB1R b KQkq - 0 8',
] as const;

/**
 * Preset position type for trial mode
 */
export type PresetPosition = {
  id: string;
  fen: string;
  title: string;
};
