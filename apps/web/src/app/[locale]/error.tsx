'use client';

import Link from 'next/link';

import { Button } from '@/app/_components';

import { useErrorBoundary } from '@/app/[locale]/_hooks/use-error-boundary';

/** Root error boundary for the `[locale]` layout. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale, t } = useErrorBoundary(error);

  return (
    <div className="flex items-center justify-center min-h-[60vh] -my-8">
      <div className="text-center max-w-md px-4">
        <h1 className="text-3xl font-bold text-foreground mb-4">{t.title}</h1>
        <p className="text-muted-foreground mb-8">{t.description}</p>
        <div className="flex gap-4 justify-center">
          <Button variant="primary" onClick={reset}>
            {t.tryAgain}
          </Button>
          <Link href={`/${locale}`}>
            <Button asChild variant="outline">
              {t.goHome}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
