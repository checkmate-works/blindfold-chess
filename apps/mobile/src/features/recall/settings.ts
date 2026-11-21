import type { Side } from "@blindfold-chess/types";

import { useAsyncStorageSettings } from "../../lib/persistent-settings/useAsyncStorageSettings";

export type RecallSettings = {
  /** The PGN last pasted, kept so a recall can be repeated. */
  pgn: string;
  playerColor: Side;
  autoOpponent: boolean;
};

export const DEFAULT_RECALL_SETTINGS: RecallSettings = {
  pgn: "",
  playerColor: "white",
  autoOpponent: true,
};

/**
 * A short, famous game offered to try the drill without a PGN at hand
 * (Morphy vs. the Duke of Brunswick and Count Isouard, Paris 1858).
 */
export const SAMPLE_PGN =
  "1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#";

export const useRecallSettings = () =>
  useAsyncStorageSettings<RecallSettings>(
    "RECALL_SETTINGS",
    DEFAULT_RECALL_SETTINGS,
  );
