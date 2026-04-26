import { PracticeLayout } from '@/app/[locale]/(public)/practice/_components/PracticeLayout';

export function FenSetupSkeleton() {
  return (
    <PracticeLayout>
      <div className="bg-card rounded-2xl p-6 border border-border mb-8">
        <div className="animate-pulse">
          {/* Title */}
          <div className="h-7 bg-muted rounded w-24 mb-4"></div>

          <div className="space-y-6">
            {/* Problem Count Slider */}
            <div>
              <div className="h-4 bg-muted rounded w-32 mb-2"></div>
              <div className="h-2 bg-muted rounded-lg"></div>
              <div className="flex justify-between mt-1">
                <div className="h-3 bg-muted rounded w-4"></div>
                <div className="h-3 bg-muted rounded w-4"></div>
              </div>
            </div>

            {/* Shuffle Toggle */}
            <div className="flex items-center justify-between">
              <div className="h-4 bg-muted rounded w-24"></div>
              <div className="w-11 h-6 bg-muted rounded-full"></div>
            </div>
          </div>

          {/* Start Button */}
          <div className="h-12 bg-muted rounded-lg mt-6"></div>
        </div>
      </div>
    </PracticeLayout>
  );
}
