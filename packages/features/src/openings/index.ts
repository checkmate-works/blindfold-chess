/**
 * Chess opening families: name, ECO code and the PGN of the defining moves.
 * The web seeds its `chess_openings` table from this list; the mobile app
 * reads it directly to offer "start from an opening" without the server.
 *
 * Do not reorder or rename entries: the web's seed keeps the order (and
 * `sortOrder`) it shipped with.
 */
export type { ChessOpeningSeed } from "./_types";
import type { ChessOpeningSeed } from "./_types";
import { openingsAdditionalD4 } from "./additional-d4";
import { openingsAdditionalE4 } from "./additional-e4";
import { openingsD4 } from "./d4";
import { openingsE4 } from "./e4";
import { openingsFlank } from "./flank";

export const CHESS_OPENINGS: readonly ChessOpeningSeed[] = [
  ...openingsE4,
  ...openingsD4,
  ...openingsFlank,
  ...openingsAdditionalE4,
  ...openingsAdditionalD4,
];
