import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// POSTGRES_URL_NON_POOLING: Direct connection (required for drizzle-kit)
// POSTGRES_URL: Pooler connection (for application use)
// DATABASE_URL: For manual configuration
// Default: Local docker-compose PostgreSQL for development
const databaseUrl =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/blindfold_chess';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
