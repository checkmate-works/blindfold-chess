import { PracticePanel } from '@/app/[locale]/(public)/practice/_components/PracticePanel';

export function BoardSymmetrySetupSkeleton() {
  return (
    <PracticePanel className="p-6">
      <div className="animate-pulse">
        {/* Section Title */}
        <div className="h-6 bg-muted rounded w-24 mb-4"></div>

        {/* Time Limit Slider */}
        <div className="mb-6">
          <div className="h-5 bg-muted rounded w-32 mb-2"></div>
          <div className="h-6 bg-muted rounded w-full mb-6"></div>
          <div className="flex justify-between">
            <div className="h-4 bg-muted rounded w-8"></div>
            <div className="h-4 bg-muted rounded w-8"></div>
            <div className="h-4 bg-muted rounded w-8"></div>
            <div className="h-4 bg-muted rounded w-8"></div>
            <div className="h-4 bg-muted rounded w-8"></div>
          </div>
        </div>

        {/* Start Button */}
        <div className="h-12 bg-muted rounded-lg"></div>
      </div>
    </PracticePanel>
  );
}
