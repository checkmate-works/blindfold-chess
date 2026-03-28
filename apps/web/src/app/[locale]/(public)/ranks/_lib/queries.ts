import { asc } from 'drizzle-orm';

import { db, ranks } from '@/lib/db';

export async function getAllRanks() {
  return db.select().from(ranks).orderBy(asc(ranks.level));
}
