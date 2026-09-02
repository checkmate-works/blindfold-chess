import type { PieceColor } from '@blindfold-chess/types';

type Props = {
  color: PieceColor;
  /** Diameter in pixels. */
  size?: number;
};

/**
 * The Go-stone-style disc used for the `circles-*` piece-shape blindfold modes,
 * extracted from `ChessBoard.renderPiece` so it can also be shown as a small
 * sample (e.g. on a shared game's play-settings badges). Pure presentational —
 * safe in both Server and Client Components.
 */
export function DiscPiece({ color, size = 24 }: Props) {
  const background =
    color === 'w'
      ? 'radial-gradient(ellipse at 30% 30%, #ffffff 0%, #e8e8e8 50%, #d0d0d0 100%)'
      : 'radial-gradient(ellipse at 30% 30%, #4a4a4a 0%, #2a2a2a 50%, #1a1a1a 100%)';
  const boxShadow =
    color === 'w'
      ? '1px 1px 2px rgba(0, 0, 0, 0.3), inset -1px -1px 2px rgba(0, 0, 0, 0.1)'
      : '1px 1px 2px rgba(0, 0, 0, 0.4), inset -1px -1px 2px rgba(255, 255, 255, 0.1)';
  return (
    <span
      aria-hidden
      className="inline-block rounded-full"
      style={{ width: size, height: size, background, boxShadow }}
    />
  );
}
