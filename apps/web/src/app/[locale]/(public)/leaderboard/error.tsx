'use client';

import { Button } from '@/app/_components';

import { PagePanel } from '@/app/[locale]/_components/PagePanel';
import { useErrorBoundary } from '@/app/[locale]/_hooks/use-error-boundary';

/** Leaderboard error boundary. */
export default function LeaderboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useErrorBoundary(error, '[Leaderboard]');

  return (
    <PagePanel>
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t.title}</h2>
        <p className="text-muted-foreground mb-6">{t.description}</p>
        <Button variant="primary" onClick={reset}>
          {t.tryAgain}
        </Button>
      </div>
    </PagePanel>
  );
}
