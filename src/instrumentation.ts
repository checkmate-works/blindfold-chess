import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

// Capture errors from nested React Server Components
export async function onRequestError(
  error: Error & { digest?: string },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: any,
  context: { routerKind: string; routePath: string; routeType: string }
) {
  // Only send to Sentry if configured
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureRequestError(error, request, context);
  }
}
