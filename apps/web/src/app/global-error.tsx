'use client';

import { useEffect } from 'react';

import NextError from 'next/error';

import * as Sentry from '@sentry/nextjs';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html data-scroll-behavior="smooth">
      <body>
        {/* This is the global error UI */}
        <NextError statusCode={500} />
      </body>
    </html>
  );
}
