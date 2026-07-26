type Props = {
  onNavigateToStart: () => void;
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  onNavigateToEnd: () => void;
  isPreviousDisabled: boolean;
  isNextDisabled: boolean;
};

/**
 * Class list for the strip a board places these controls in.
 *
 * Those strips are otherwise `aspectRatio: 8/1` — exactly one rank tall, so
 * the stepper reads as a continuation of the board. On a phone that ratio
 * resolves to ~47px, which is shorter than the touch-sized buttons below, so
 * the proportion is dropped under `sm` and the strip is sized by its content
 * instead. Boards that host the controls in normal flow (a moves panel, say)
 * do not need this.
 */
export const MOVE_NAV_ROW_CLASS = 'min-h-14 sm:min-h-0 sm:aspect-[8/1]';

/**
 * On a phone the four buttons stretch to fill the row (~80px wide each) and
 * stand 56px tall; from `sm` up they collapse to the compact 48px centred
 * cluster. Four identical glyphs packed into 48px squares 4px apart is a
 * mis-tap trap for a thumb, while a mouse hits it precisely — so the touch
 * target grows only where the input is a finger.
 */
const BUTTON_CLASS =
  'flex-1 h-14 flex items-center justify-center hover:bg-muted active:bg-muted rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:active:bg-transparent font-mono text-3xl sm:flex-none sm:w-12 sm:h-12 sm:text-2xl';

export function MoveNavigationControls({
  onNavigateToStart,
  onNavigatePrevious,
  onNavigateNext,
  onNavigateToEnd,
  isPreviousDisabled,
  isNextDisabled,
}: Props) {
  return (
    <div className="w-full flex justify-center gap-1.5 sm:w-auto sm:gap-1">
      <button
        type="button"
        onClick={onNavigateToStart}
        className={BUTTON_CLASS}
        aria-label="Go to start"
        disabled={isPreviousDisabled}
      >
        «
      </button>
      <button
        type="button"
        onClick={onNavigatePrevious}
        className={BUTTON_CLASS}
        aria-label="Previous move"
        disabled={isPreviousDisabled}
      >
        ‹
      </button>
      <button
        type="button"
        onClick={onNavigateNext}
        className={BUTTON_CLASS}
        aria-label="Next move"
        disabled={isNextDisabled}
      >
        ›
      </button>
      <button
        type="button"
        onClick={onNavigateToEnd}
        className={BUTTON_CLASS}
        aria-label="Go to end"
        disabled={isNextDisabled}
      >
        »
      </button>
    </div>
  );
}
