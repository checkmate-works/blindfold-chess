import type { CSSProperties } from 'react';

import type { PieceColor } from '@blindfold-chess/features/board-display';

/**
 * Inline CSS for a Go stone-like disc — the visual used to render a piece whose
 * *shape* is obfuscated (`pieceShapeMode` → circle). A subtle radial gradient
 * plus drop/inset shadow gives the stone a physical, lit-from-upper-left look.
 *
 * Shared so the interactive board (`ChessBoard`) and the static
 * `BoardThumbnail` draw an identical stone — the thumbnail reflects the game's
 * "as played" settings, and drift between the two renderers would make the
 * preview and the detail board disagree.
 */
export function goStoneStyle(color: PieceColor): CSSProperties {
  return color === 'w'
    ? {
        background: 'radial-gradient(ellipse at 30% 30%, #ffffff 0%, #e8e8e8 50%, #d0d0d0 100%)',
        boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(0, 0, 0, 0.1)',
      }
    : {
        background: 'radial-gradient(ellipse at 30% 30%, #4a4a4a 0%, #2a2a2a 50%, #1a1a1a 100%)',
        boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.4), inset -1px -1px 3px rgba(255, 255, 255, 0.1)',
      };
}
