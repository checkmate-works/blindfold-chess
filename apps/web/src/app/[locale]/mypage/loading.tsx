import { PagePanel } from '../_components';
import { DashboardSkeleton } from './_components/DashboardSkeleton';

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="animate-pulse rounded-md bg-muted h-7 md:h-8 w-40 mx-auto mb-8" />
      <PagePanel>
        <DashboardSkeleton />
      </PagePanel>
    </div>
  );
}
