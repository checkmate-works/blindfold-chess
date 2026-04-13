// Barrel re-exporting both halves of the FEN helpers to preserve the historical
// `./chess-core/fen` import path from within the package and from the
// chess-core barrel (`./index.ts`). External consumers that want the
// chess.js-free subset should import from `@blindfold-chess/features/chess-core/fen`
// (wired to `fen-pure.ts` via the package's `exports` field), NOT this file.
export * from "./fen-pure";
export * from "./fen-chess";
