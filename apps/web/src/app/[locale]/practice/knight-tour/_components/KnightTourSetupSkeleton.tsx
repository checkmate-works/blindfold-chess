export function KnightTourSetupSkeleton() {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6">
      <div className="animate-pulse">
        {/* Section Title */}
        <div className="h-6 bg-muted rounded w-24 mb-4"></div>

        {/* Starting Square Select */}
        <div className="mb-6">
          <div className="h-4 bg-muted rounded w-32 mb-2"></div>
          <div className="h-10 bg-muted rounded-lg"></div>
        </div>

        {/* Blindfold Mode Toggle */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-muted rounded"></div>
            <div>
              <div className="h-4 bg-muted rounded w-28 mb-1"></div>
              <div className="h-3 bg-muted rounded w-48"></div>
            </div>
          </div>
        </div>

        {/* Hint Text */}
        <div className="h-4 bg-muted rounded w-64 mb-6"></div>

        {/* Start Button */}
        <div className="h-12 bg-muted rounded-lg"></div>
      </div>
    </div>
  );
}
