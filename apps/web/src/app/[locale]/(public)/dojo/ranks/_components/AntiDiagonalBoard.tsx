import { HighlightedBoard, type Overlay } from './_shared/HighlightedBoard';

const ANTI_DIAGONAL_SQUARES = [
  { x: 0, y: 0 },
  { x: 12.5, y: 12.5 },
  { x: 25, y: 25 },
  { x: 37.5, y: 37.5 },
  { x: 50, y: 50 },
  { x: 62.5, y: 62.5 },
  { x: 75, y: 75 },
  { x: 87.5, y: 87.5 },
];

const OVERLAYS: Overlay[] = [
  {
    kind: 'rect',
    squares: ANTI_DIAGONAL_SQUARES,
    fill: 'currentColor',
    opacity: 0.4,
    currentColorClass: 'text-emerald-500',
  },
];

export function AntiDiagonalBoard({ className }: { className?: string }) {
  return <HighlightedBoard overlays={OVERLAYS} className={className} />;
}
