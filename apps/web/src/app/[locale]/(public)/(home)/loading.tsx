import { FeedSkeleton } from './_components/FeedSkeleton';

export default function HomeLoading() {
  return (
    <>
      <div className="mb-8">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
      </div>

      <div className="space-y-6">
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <FeedSkeleton count={5} />
        </div>
      </div>
    </>
  );
}
