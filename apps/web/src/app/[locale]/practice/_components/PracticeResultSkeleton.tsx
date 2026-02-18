'use client';

import { Divider, SectionTitle } from '@/app/[locale]/_components';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} {...props} />;
}

export function PracticeResultSkeleton() {
  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-8">
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

        {/* Related learning module placeholder */}
        <div className="mt-12">
          <SectionTitle className="text-xl font-semibold mb-4">
            <Skeleton className="h-8 w-48" />
          </SectionTitle>
          <div className="border rounded-xl p-4 flex items-start space-x-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </div>

      <Divider />

      {/* Breadcrumb placeholder */}
      <div className="flex space-x-2">
        <Skeleton className="h-4 w-16" />
        <span className="text-muted-foreground">/</span>
        <Skeleton className="h-4 w-24" />
        <span className="text-muted-foreground">/</span>
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}
