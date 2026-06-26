import { Skeleton } from '@/app/[locale]/_components';

/**
 * Loading fallback for the diagonal-quiz training session, shaped like the
 * actual playing screen (`DiagonalQuizTrainingPlaying`): a centered prompt,
 * the large target square, two diagonal input fields, the coordinate keypad,
 * and the score counter.
 *
 * The shared `PracticeResultSkeleton` is a result-panel shape (score + two
 * action buttons), which is correct for result-page loading but diverges from
 * this screen — training never lands on a result page, so its only loading
 * state is the brief initial batch generation before the playing screen. The
 * surrounding `PageTitle` / `PageLayout` / `Breadcrumb` chrome is already in
 * the DOM at that point, so this only needs to fill the inner play area.
 */
export function DiagonalQuizTrainingSkeleton() {
  return (
    <div className="max-w-md mx-auto">
      <div className="text-center">
        {/* Question prompt */}
        <Skeleton className="h-7 w-3/4 mx-auto mb-4" />

        {/* Target square */}
        <div className="mb-6">
          <Skeleton className="h-16 w-24 mx-auto" />
        </div>

        {/* Two diagonal input fields (left-aligned label + full-width input) */}
        <div className="space-y-3 mb-6">
          {[0, 1].map((i) => (
            <div key={i}>
              <Skeleton className="h-4 w-24 mb-1" disableAnimation />
              <Skeleton className="h-[52px] w-full rounded-lg" />
            </div>
          ))}
        </div>

        {/* Coordinate keypad: file row, rank row, action row */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="mt-1 h-11 w-full" />
        </div>
      </div>

      {/* Score counter */}
      <div className="mt-8 flex justify-center items-center gap-12">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}
