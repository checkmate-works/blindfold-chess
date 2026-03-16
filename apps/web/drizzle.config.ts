import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

dotenv.config({ path: ['.env.local', '.env'] });

// POSTGRES_URL_NON_POOLING: Direct connection (required for drizzle-kit)
// POSTGRES_URL: Pooler connection (for application use)
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
