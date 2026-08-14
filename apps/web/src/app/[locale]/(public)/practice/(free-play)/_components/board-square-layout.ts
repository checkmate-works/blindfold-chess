import { DISPLAY_RANKS, FILES } from '@blindfold-chess/types';

/**
 * Where a grid cell sits and which square label it carries, for a board
 * rendered as 64 cells in reading order (index 0 top-left).
 *
 * The flip is the reason this is shared. `displayIndex` inverts the *piece*
 * lookup while `gridFile` / `gridRank` stay in screen space, because the
 * coordinate labels are read off reversed axis arrays instead — get that
 * backwards and the board renders pieces mirrored relative to their labels.
 * Both free-play boards had the derivation written out inline, comments
 * included.
 */
export function deriveSquareCell(squareIndex: number, flipped: boolean) {
  const gridFile = squareIndex % 8;
  const gridRank = Math.floor(squareIndex / 8);
  const displayFiles = flipped ? [...FILES].reverse() : [...FILES];
  const displayRanks = flipped ? [...DISPLAY_RANKS].reverse() : [...DISPLAY_RANKS];

  return {
    /** Index into the unflipped board array for the piece shown in this cell. */
    displayIndex: flipped ? 63 - squareIndex : squareIndex,
    gridFile,
    gridRank,
    file: displayFiles[gridFile],
    rank: displayRanks[gridRank],
    /** Rank labels run down the left edge, file labels along the bottom. */
    showRankCoordinate: gridFile === 0,
    showFileCoordinate: gridRank === 7,
  };
}
