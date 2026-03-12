import { SectionTitle } from '@/app/[locale]/_components';

type Props = {
  title: string;
};

export function LatestTopicPostsSkeleton({ title }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6 md:p-8 shadow-sm space-y-4">
      <SectionTitle>{title}</SectionTitle>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 p-4 rounded-lg border border-border animate-pulse">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-muted rounded-md flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-muted rounded w-24" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-28 mt-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
