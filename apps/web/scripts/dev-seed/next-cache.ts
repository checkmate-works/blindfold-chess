import { readFileSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';

/** Next's on-disk Data Cache, relative to `apps/web`. */
const FETCH_CACHE_DIR = join('.next', 'cache', 'fetch-cache');

/**
 * Drop the Data Cache entries carrying a given `revalidateTag` tag.
 *
 * Seeding rows is not enough to make them show up. `getDailyPuzzle` is an
 * `unstable_cache` read, so the "pool is empty → null" answer from before the
 * seed is written to `.next/cache/fetch-cache` and survives a dev-server
 * restart — the card stays missing for up to the hour of its `revalidate`,
 * with nothing on screen to say why. The app revalidates this tag when an
 * admin features a puzzle; a script writing straight to the DB has no way to
 * signal that, so it deletes the entries instead.
 *
 * Deliberately reaches into a Next internal. It is local-only (the caller
 * refuses to run against anything but a localhost DB), a cache entry is
 * regenerated on the next read, and the alternative — telling everyone to
 * `rm -rf .next` after seeding — throws away the whole build. If Next changes
 * the format this stops matching and removes nothing, which is why the caller
 * prints the count: zero removed on a machine that has run the app is the
 * signal that this needs revisiting.
 *
 * A dev server already running keeps its own in-memory copy of the entry, so
 * it still has to be restarted afterwards.
 */
export function purgeDataCacheTag(tag: string): number {
  let entries: string[];
  try {
    entries = readdirSync(FETCH_CACHE_DIR);
  } catch {
    return 0; // no build yet — nothing cached to contradict the seed
  }

  let removed = 0;
  for (const name of entries) {
    const path = join(FETCH_CACHE_DIR, name);
    let tags: unknown;
    try {
      tags = (JSON.parse(readFileSync(path, 'utf-8')) as { tags?: unknown }).tags;
    } catch {
      continue; // not a JSON cache entry, or unreadable — leave it alone
    }
    if (Array.isArray(tags) && tags.includes(tag)) {
      rmSync(path, { force: true });
      removed++;
    }
  }
  return removed;
}
