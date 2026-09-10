import { Skeleton } from '@/app/[locale]/_components';

/**
 * The three blocks every `*PlaySkeleton` draws around its module-specific
 * middle: the challenge lives/timer header, the score counter, and the
 * quit / end-training link.
 *
 * Seven modules had all three written out identically, and the drift showed
 * up where it matters for a placeholder: `RoutePlannerPlaySkeleton` had no
 * quit-link block at all even though `RoutePlannerSession` renders one, so
 * that skeleton reserved less height than the screen replacing it.
 *
 * A skeleton earns its keep only if nothing moves when the screen replaces
 * it, so each block mirrors the live one exactly:
 *
 * - The header takes a `className` because it sits inside each module's own
 *   layout.
 * - The score takes a `className` for the same reason `ScoreCounter` does —
 *   `mt-8` everywhere but the coordinate quiz, which sits closer to its
 *   board. **Where** it goes matters as much as the margin: on a challenge
 *   screen the score is the last child inside `ChallengeSessionVeil`, whose
 *   box has top and side padding only, so the skeleton's score must be the
 *   last child inside the padded box that stands in for the veil. A score
 *   drawn after that box lands a full padding's worth lower than the real
 *   one and jumps up when the page loads.
 * - The quit link takes no `className`: it is `mt-6` on every screen
 *   (`ChallengeQuitControl` and `TrainingFooter` both fix it), so the
 *   skeleton fixes it too.
 */

/** Lives on the left, pause/timer on the right. Challenge mode only. */
export function PlayHeaderSkeleton({ className }: { className: string }) {
  return (
    <div className={className}>
      <Skeleton className="h-5 w-28 rounded-md" disableAnimation />
      <Skeleton className="h-10 w-10 rounded-full" disableAnimation />
    </div>
  );
}

/** The correct / incorrect pair under the play area. */
export function PlayScoreCounterSkeleton({ className }: { className: string }) {
  return (
    <div className={className}>
      <Skeleton className="h-8 w-16 rounded-md" />
      <Skeleton className="h-8 w-16 rounded-md" />
    </div>
  );
}

/**
 * The quit (challenge) / end-training (training) link at the bottom, 24px
 * under the score like the real one.
 */
export function PlayQuitLinkSkeleton() {
  return (
    <div className="mt-6 flex justify-center">
      <Skeleton className="h-5 w-24 rounded-md" disableAnimation />
    </div>
  );
}
