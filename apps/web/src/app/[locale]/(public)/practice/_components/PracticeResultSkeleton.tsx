import { Skeleton } from '@/app/[locale]/_components';

export function PracticeResultSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-card rounded-xl shadow-sm border border-border p-8">
        {/* Score display placeholder */}
        <div className="mb-6 text-center flex flex-col items-center">
          <Skeleton className="h-10 w-32 mb-2" />
          <Skeleton className="h-5 w-24" />
        </div>

        {/* Action buttons placeholder */}
        <div className="space-y-4 mt-6">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
