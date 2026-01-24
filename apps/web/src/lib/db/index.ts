import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

// Default to local docker-compose PostgreSQL for development
const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/blindfold_chess';

// For use in application code
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });

// Re-export schema for convenience
export * from './schema';
