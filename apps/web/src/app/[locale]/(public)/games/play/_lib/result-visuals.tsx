import type { IconType } from 'react-icons';
import { FaMinus, FaTimes, FaTrophy } from 'react-icons/fa';

/** Terminal result from the player's own perspective. */
export type GameResult = 'win' | 'loss' | 'draw';

/** Icon per terminal result. */
const RESULT_ICON: Record<GameResult, IconType> = {
  win: FaTrophy,
  loss: FaTimes,
  draw: FaMinus,
};

/** Accent color class per terminal result. */
const RESULT_COLOR: Record<GameResult, string> = {
  win: 'text-primary',
  loss: 'text-destructive',
  draw: 'text-warning',
};

/**
 * `play`-namespace i18n key for the first-person result label. Kept alongside
 * the icon so the two stay in lockstep. The shared game review names the winner
 * neutrally instead (see `GameOutcomeLabel`), so it does not use this.
 */
export const RESULT_LABEL_KEY: Record<GameResult, string> = {
  win: 'youWin',
  loss: 'youLose',
  draw: 'draw',
};

type Props = {
  result: GameResult;
  /** Sizing (and any extra) classes; the result-accent color is applied for you. */
  className?: string;
};

/**
 * The win/loss/draw icon (trophy / cross / dash) with its result-accent color,
 * shared by the result-screen header (`CompactResultHeader`) and the in-play
 * finished-game overlay (`GameInProgressPanel`) so the mapping lives in one
 * place. The caller supplies only the size via {@link Props.className}.
 */
export function ResultIcon({ result, className }: Props) {
  const Icon = RESULT_ICON[result];
  return <Icon className={`${RESULT_COLOR[result]} ${className ?? ''}`.trim()} />;
}
