/**
 * Extract a PostgreSQL error code from an Error, checking both the error
 * itself and its `cause` chain. Drizzle ORM wraps the original PostgresError
 * in a generic Error, so the code may appear on either level.
 *
 * Returns `undefined` if the error is not an Error instance or has no PG code.
 */
export function extractPgErrorCode(err: unknown): string | undefined {
  if (!(err instanceof Error)) return undefined;

  const codeFromError = 'code' in err ? (err as { code: string }).code : undefined;
  if (codeFromError) return codeFromError;

  if (err.cause instanceof Error && 'code' in err.cause) {
    return (err.cause as { code: string }).code;
  }

  return undefined;
}
