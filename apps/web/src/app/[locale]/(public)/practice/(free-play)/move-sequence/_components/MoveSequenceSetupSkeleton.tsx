import { PracticeLayout } from '@/app/[locale]/(public)/practice/_components/PracticeLayout';

export function MoveSequenceSetupSkeleton() {
  return (
    <PracticeLayout>
      <div className="bg-card rounded-2xl p-6 border border-border">
        <div className="animate-pulse">
          {/* Title */}
          <div className="h-7 bg-muted rounded w-32 mb-6"></div>

          <div className="space-y-6">
            {/* Problem Source Toggle */}
            <div>
              <div className="h-4 bg-muted rounded w-24 mb-2"></div>
              <div className="flex rounded-lg bg-secondary p-1">
                <div className="flex-1 h-10 bg-muted rounded-md"></div>
                <div className="flex-1 h-10 bg-muted/50 rounded-md"></div>
              </div>
            </div>

            {/* Preset List Label */}
            <div>
              <div className="h-4 bg-muted rounded w-40 mb-2"></div>
              <div className="space-y-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="h-12 bg-muted rounded-lg"></div>
                ))}
              </div>
            </div>

            {/* Include Opponent Moves Toggle */}
            <div className="flex items-center justify-end gap-3">
              <div className="h-4 bg-muted rounded w-32"></div>
              <div className="w-11 h-6 bg-muted rounded-full"></div>
            </div>

            {/* Start Button */}
            <div className="h-12 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>

      {/* Reset Settings Button */}
      <div className="mt-8 flex justify-end">
        <div className="h-10 bg-muted rounded w-32"></div>
      </div>
    </PracticeLayout>
  );
}
