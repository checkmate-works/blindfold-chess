'use client';

import { SteppedTutorial } from '@/app/[locale]/(public)/practice/(challenge)/_components/SteppedTutorial';
import { TutorialBoardFrame } from '@/app/[locale]/(public)/practice/(challenge)/_components/TutorialBoardFrame';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

type TutorialStep = 'intro' | 'horizontal' | 'vertical' | 'point' | 'start';

const STEPS: readonly TutorialStep[] = ['intro', 'horizontal', 'vertical', 'point', 'start'];

const EMPTY_BOARD_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';

const OVERLAY_CLASSES = 'absolute inset-0 w-full h-full pointer-events-none z-10';

/**
 * Each mirror axis is shown as a dashed red line through the reflection plane,
 * plus a pair of blue arcs connecting two squares that map onto each other.
 *
 * Only the first axis step declares the `#arrowhead` marker, and each step's
 * overlay replaces the previous one — so the `markerEnd="url(#arrowhead)"` on
 * the later two steps resolves to nothing and their arcs render unheaded. That
 * predates this component being extracted and is preserved as-is; hoisting the
 * `<defs>` out of the first step would add arrowheads to two steps that have
 * never had them, which is a design call, not a refactor.
 */
function StepOverlay({ step }: { step: TutorialStep }) {
  switch (step) {
    case 'horizontal':
      return (
        <svg className={OVERLAY_CLASSES} viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Dashed line between d and e files (center vertical) */}
          <line
            x1="50"
            y1="0"
            x2="50"
            y2="100"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeDasharray="2 2"
            className="text-red-500"
          />
          {/* Arrows connecting equivalent files */}
          <path
            d="M 12.5 90 Q 50 70 87.5 90"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-blue-500 opacity-60"
            markerEnd="url(#arrowhead)"
          />
          <path
            d="M 87.5 90 Q 50 70 12.5 90"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-blue-500 opacity-60"
            markerEnd="url(#arrowhead)"
          />

          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" className="text-blue-500" />
            </marker>
          </defs>
        </svg>
      );
    case 'vertical':
      return (
        <svg className={OVERLAY_CLASSES} viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Dashed line between 4 and 5 ranks (center horizontal) */}
          <line
            x1="0"
            y1="50"
            x2="100"
            y2="50"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeDasharray="2 2"
            className="text-red-500"
          />
          {/* Arrows connecting equivalent ranks */}
          <path
            d="M 10 87.5 Q 30 50 10 12.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-blue-500 opacity-60"
            markerEnd="url(#arrowhead)"
          />
          <path
            d="M 10 12.5 Q 30 50 10 87.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-blue-500 opacity-60"
            markerEnd="url(#arrowhead)"
          />
        </svg>
      );
    case 'point':
      return (
        <svg className={OVERLAY_CLASSES} viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Center point */}
          <circle cx="50" cy="50" r="1.5" fill="currentColor" className="text-red-500" />
          {/* Rotation arrows */}
          <path
            d="M 12.5 87.5 Q 50 50 87.5 12.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-blue-500 opacity-60"
            markerEnd="url(#arrowhead)"
          />
          <path
            d="M 87.5 12.5 Q 50 50 12.5 87.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-blue-500 opacity-60"
            markerEnd="url(#arrowhead)"
          />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * Walks the three symmetries the challenge quizzes — mirror across the files,
 * mirror across the ranks, and 180° point rotation — on an empty board so the
 * axes are the only thing to look at.
 */
export function BoardSymmetryTutorial({ locale }: Props) {
  return (
    <SteppedTutorial
      locale={locale}
      moduleSlug="board-symmetry"
      steps={STEPS}
      namespace="practice.boardSymmetry.tutorial"
      renderStep={(step) => (
        <TutorialBoardFrame fen={EMPTY_BOARD_FEN}>
          <StepOverlay step={step} />
        </TutorialBoardFrame>
      )}
    />
  );
}
