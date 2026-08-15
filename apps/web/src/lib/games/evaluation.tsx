import type { ReactElement, ReactNode } from 'react';

import { FaCheck, FaStar } from 'react-icons/fa';

import type { MoveJudgment } from './analysis/types';

export type { EvaluationMark } from './evaluation-types';

type EvaluationIconSize = 'sm' | 'md';

const sizeClasses: Record<EvaluationIconSize, { container: string; icon: string; text: string }> = {
  sm: { container: 'w-4 h-4', icon: 'w-2 h-2', text: 'text-[10px]' },
  md: { container: 'w-5 h-5', icon: 'w-2.5 h-2.5', text: 'text-[11px]' },
};

/**
 * How each grade is drawn: its standard chess annotation glyph and a severity
 * colour. `?!` / `?` / `??` are the notation every chess reader already knows
 * (they are taught on the algebraic-notation guide page), so a grade is shown
 * as the symbol rather than as a word. The two good grades have no annotation
 * symbol of their own — `!` and `!!` mean "brilliant", which a low centipawn
 * loss does not establish — so they borrow an icon.
 */
const judgmentStyle: Record<
  MoveJudgment,
  { bgColor: string; glyph: (iconClass: string) => ReactNode }
> = {
  best: { bgColor: 'bg-success', glyph: (icon) => <FaStar className={`${icon} text-white`} /> },
  good: { bgColor: 'bg-success', glyph: (icon) => <FaCheck className={`${icon} text-white`} /> },
  inaccuracy: { bgColor: 'bg-warning', glyph: () => '?!' },
  mistake: { bgColor: 'bg-caution', glyph: () => '?' },
  blunder: { bgColor: 'bg-destructive', glyph: () => '??' },
};

/**
 * The round move-grade badge (chess.com style), shared by every surface that
 * grades a move: the board's per-square mark and the AI review's key moments.
 *
 * @param label the grade's localized name. A punctuation glyph reads as
 *   nothing to a screen reader and means nothing to a beginner, so pass the
 *   word — it becomes the badge's accessible name and its tooltip. Omit only
 *   where the surrounding text already names the grade.
 */
export function MoveJudgmentBadge({
  judgment,
  size = 'md',
  label,
}: {
  judgment: MoveJudgment;
  /** 'sm' for move logs and inline rows, 'md' for board badges. */
  size?: EvaluationIconSize;
  label?: string;
}): ReactElement {
  const classes = sizeClasses[size];
  const { bgColor, glyph } = judgmentStyle[judgment];

  return (
    <span
      className={`inline-flex items-center justify-center ${classes.container} rounded-full ${bgColor} ${classes.text} font-bold text-white`}
      {...(label ? { role: 'img', 'aria-label': label, title: label } : {})}
    >
      {glyph(classes.icon)}
    </span>
  );
}
