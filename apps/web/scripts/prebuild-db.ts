/**
 * Prebuild script for DB migration and seeding.
 *
 * Skips migration/seed when no DB environment variable is set
 * (POSTGRES_URL_NON_POOLING, POSTGRES_URL, DATABASE_URL).
 *
 * Note: Even when this script skips, `next build` itself requires a DB
 * connection because some pages (e.g. glossary/letter/[letter]) use
 * generateStaticParams to query the database at build time.
 * A full `pnpm build` therefore requires a running database.
 * This is by design — production builds always have DB access.
 */
import 'dotenv/config';
import { execSync } from 'node:child_process';

const hasDbConnection =
  process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!hasDbConnection) {
  console.log(
    'No database connection configured (POSTGRES_URL / DATABASE_URL not set). Skipping DB migration and seed.'
  );
  process.exit(0);
}

try {
  execSync('pnpm db:run-migrate', { stdio: 'inherit' });
  execSync('pnpm db:seed', { stdio: 'inherit' });
} catch (error) {
  console.error('Database prebuild failed:', error);
  process.exit(1);
}
