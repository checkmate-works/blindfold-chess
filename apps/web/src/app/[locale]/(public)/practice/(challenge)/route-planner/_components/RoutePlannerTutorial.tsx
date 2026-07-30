'use client';

import { SteppedTutorial } from '@/app/[locale]/(public)/practice/(challenge)/_components/SteppedTutorial';
import { TutorialBoardFrame } from '@/app/[locale]/(public)/practice/(challenge)/_components/TutorialBoardFrame';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

type TutorialStep = 'intro' | 'visualization' | 'start';

const STEPS: readonly TutorialStep[] = ['intro', 'visualization', 'start'];

/** A lone knight on e4 — the piece and start square the overlay routes from. */
const KNIGHT_FEN = '8/8/8/8/4N3/8/8/8 w - - 0 1';

const OVERLAY_CLASSES = 'absolute inset-0 w-full h-full pointer-events-none z-10';

/** The circled target square the route has to reach (h5 in SVG coordinates). */
function GoalMarker({ pulse = false }: { pulse?: boolean }) {
  return (
    <>
      <circle
        cx="93.75"
        cy="43.75"
        r="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        className={`text-red-500 ${pulse ? 'animate-pulse' : ''}`}
      />
      <text
        x="93.75"
        y="43.75"
        textAnchor="middle"
        dy="1.5"
        fontSize="4"
        fill="currentColor"
        className="text-red-500 font-bold"
      >
        GOAL
      </text>
    </>
  );
}

/**
 * Intro pulses the goal square to name the task; the visualization step draws
 * the two knight hops that reach it, which is the mental picture the challenge
 * asks the player to build unaided.
 */
function StepOverlay({ step }: { step: TutorialStep }) {
  if (step === 'visualization') {
    return (
      <svg className={OVERLAY_CLASSES} viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <marker
            id="arrowhead-blue"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" className="text-blue-500" />
          </marker>
        </defs>
        <line
          x1="56.25"
          y1="56.25"
          x2="68.75"
          y2="31.25"
          stroke="currentColor"
          strokeWidth="1"
          className="text-blue-500 opacity-60"
          markerEnd="url(#arrowhead-blue)"
        />
        <line
          x1="68.75"
          y1="31.25"
          x2="93.75"
          y2="43.75"
          stroke="currentColor"
          strokeWidth="1"
          className="text-blue-500 opacity-60"
          markerEnd="url(#arrowhead-blue)"
        />
        <GoalMarker />
      </svg>
    );
  }

  return (
    <svg className={OVERLAY_CLASSES} viewBox="0 0 100 100" preserveAspectRatio="none">
      {step === 'intro' ? (
        <GoalMarker pulse />
      ) : (
        /* Final step: the goal stays visible, unlabelled, behind the CTA. */
        <circle
          cx="93.75"
          cy="43.75"
          r="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-red-500"
        />
      )}
    </svg>
  );
}

/**
 * Explains the challenge's ask — get the knight to the circled square in as
 * few hops as possible — by drawing the route the player is expected to
 * visualize without the board's help.
 */
export function RoutePlannerTutorial({ locale }: Props) {
  return (
    <SteppedTutorial
      locale={locale}
      moduleSlug="route-planner"
      steps={STEPS}
      namespace="practice.routePlanner.tutorial"
      descriptionClassName="whitespace-pre-wrap text-center"
      renderStep={(step) => (
        <TutorialBoardFrame fen={KNIGHT_FEN}>
          <StepOverlay step={step} />
        </TutorialBoardFrame>
      )}
    />
  );
}
