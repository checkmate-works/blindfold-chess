import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

// POSTGRES_URL: Set by Vercel Marketplace Supabase integration
// DATABASE_URL: For manual configuration
// Default: Local docker-compose PostgreSQL for development
const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/blindfold_chess';

// For use in application code
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });

// Re-export schema for convenience
export * from './schema';
