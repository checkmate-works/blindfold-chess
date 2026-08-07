import { BoardFrame, BoardSkeleton } from '@/app/_components';

// Remove ("×") button + 6 piece types (K Q R B N P) — matches the palette
// rendered by EditableChessBoard's `renderPalette`.
const PALETTE_SLOTS = 7;

/**
 * Placeholder for one White/Black piece palette. Mirrors the exact wrapper,
 * padding and button sizing of `EditableChessBoard`'s `renderPalette` so the
 * reserved height is identical to the real palette.
 */
function PaletteSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Label (h3 text-xs) placeholder. */}
      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      <div className="flex gap-1 sm:gap-2 p-2 sm:p-3 border border-border rounded-lg">
        {Array.from({ length: PALETTE_SLOTS }, (_, i) => (
          <div
            key={i}
            className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 animate-pulse rounded border-2 border-border bg-muted"
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Loading placeholder for {@link EditableChessBoard} in `editable` mode.
 * Reproduces that component's full vertical structure — top palette, board,
 * mode indicator, bottom palette — so swapping it for the real editor once
 * `useGamePreferences` hydrates does not shift layout (no CLS). Using
 * `BoardSkeleton` alone reserves only the board square and lets the two
 * palettes pop in afterwards, pushing everything below them down.
 */
export function EditableBoardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4">
      <PaletteSkeleton />
      <BoardFrame>
        <BoardSkeleton />
      </BoardFrame>
      {/* Mode indicator (text-sm) placeholder. */}
      <div className="h-5 w-40 animate-pulse rounded bg-muted" />
      <PaletteSkeleton />
    </div>
  );
}
