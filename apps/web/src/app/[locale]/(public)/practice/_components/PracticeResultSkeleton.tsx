import { Skeleton } from '@/app/[locale]/_components';

import { PracticeLayout } from './PracticeLayout';
import { PracticePanel } from './PracticePanel';

export function PracticeResultSkeleton() {
  return (
    <PracticeLayout>
      <PracticePanel className="p-8">
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
      </PracticePanel>
    </PracticeLayout>
  );
}
