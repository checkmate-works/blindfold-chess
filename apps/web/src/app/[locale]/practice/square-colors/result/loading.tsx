import { Divider, PageTitle } from '@/app/[locale]/_components';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} {...props} />;
}

export default function Loading() {
  return (
    <div className="space-y-8">
      <PageTitle>&nbsp;</PageTitle>

      {/* PracticeComplete card skeleton: matches max-w-4xl mx-auto > bg-card rounded-xl */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-xl shadow-sm border border-border p-8">
          <div className="mb-6 text-center flex flex-col items-center">
            <Skeleton className="h-10 w-32 mb-2" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="space-y-4 mt-6">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>

      <Divider />

      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  );
}
