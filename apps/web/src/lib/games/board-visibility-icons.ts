import type { IconType } from 'react-icons';
import { FaEye, FaEyeSlash, FaHandPointer } from 'react-icons/fa';

import type { BoardVisibility } from './board-visibility';

/**
 * Shared icon mapping for the `boardVisibility` 3-state setting. Used by
 * every surface that renders a board-visibility picker (the onboarding
 * step 2 cards, and the shared `BoardVisibilityPicker` behind the new-game
 * form, the Preferences "Game" tab, and the mid-game settings modal) so the
 * icon vocabulary stays consistent across the app.
 *
 * Icon choices:
 *  - `always` → {@link FaEye}            (eye open: board is always in view)
 *  - `peek`   → {@link FaHandPointer}    (tap gesture: reveal on demand)
 *  - `never`  → {@link FaEyeSlash}       (eye blocked: board never shown)
 */
export const BOARD_VISIBILITY_ICON: Record<BoardVisibility, IconType> = {
  always: FaEye,
  peek: FaHandPointer,
  never: FaEyeSlash,
};
