import { PracticeLayout } from '@/app/[locale]/(public)/practice/_components/PracticeLayout';

export function PositionMemorySetupSkeleton() {
  return (
    <PracticeLayout>
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mb-8">
        <div className="animate-pulse">
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

            {/* Problem Count Slider */}
            <div>
              <div className="h-4 bg-muted rounded w-28 mb-2"></div>
              <div className="h-2 bg-muted rounded-md"></div>
              <div className="flex justify-between mt-1">
                <div className="h-3 bg-muted rounded w-4"></div>
                <div className="h-3 bg-muted rounded w-4"></div>
              </div>
            </div>

            {/* Shuffle Toggle */}
            <div className="flex items-center justify-end gap-3">
              <div className="h-4 bg-muted rounded w-20"></div>
              <div className="w-11 h-6 bg-muted rounded-full"></div>
            </div>

            {/* Time Limit Slider */}
            <div>
              <div className="h-4 bg-muted rounded w-32 mb-2"></div>
              <div className="h-2 bg-muted rounded-md"></div>
              <div className="flex justify-between mt-1">
                <div className="h-3 bg-muted rounded w-8"></div>
                <div className="h-3 bg-muted rounded w-8"></div>
              </div>
            </div>

            {/* Start Button */}
            <div className="h-12 bg-muted rounded-lg mt-6"></div>
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
