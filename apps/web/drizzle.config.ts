import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

dotenv.config({ path: ['.env.local', '.env'] });

// POSTGRES_URL_NON_POOLING: Supavisor session pooler (preferred for schema
//   work — one pinned backend per connection; see the policy in
//   scripts/migrate.ts, which uses the same priority)
// POSTGRES_URL: Transaction pooler (fallback)
// DATABASE_URL: For manual configuration
// Default: Supabase local PostgreSQL for development
const databaseUrl =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  migrations: {
    prefix: 'timestamp',
  },
});
