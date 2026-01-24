import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Default to local docker-compose PostgreSQL for development
const databaseUrl =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/blindfold_chess';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
