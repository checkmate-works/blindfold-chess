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
 * Each part takes a `className` because the surrounding spacing genuinely
 * differs per module — it mirrors each playing screen's own layout, which is
 * what these placeholders exist to match.
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

/** The quit (challenge) / end-training (training) link at the bottom. */
export function PlayQuitLinkSkeleton({ className }: { className: string }) {
  return (
    <div className={className}>
      <Skeleton className="h-5 w-24 rounded-md" disableAnimation />
    </div>
  );
}
