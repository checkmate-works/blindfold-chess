import { drizzle } from 'drizzle-orm/postgres-js';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { LOCAL_DATABASE_URL } from '@/lib/local-supabase';

import {
  deleteAnnouncementWithLikes,
  getAnnouncementLikeCountsBySlug,
  getAnnouncementLikeMeta,
  toggleAnnouncementLike,
  updateAnnouncementPreservingLikes,
} from './announcement-likes';

// Opt in explicitly. Only the local Supabase is used, with isolated tables;
// queries below call the production helpers through a real Drizzle client.
const state = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/lib/db', async () => ({
  ...(await vi.importActual('@/lib/db/schema')),
  get db() {
    return state.db;
  },
}));

const schemaName = `announcement_test_${randomUUID().replaceAll('-', '')}`;
const client = postgres(LOCAL_DATABASE_URL, {
  max: 5,
  connection: { search_path: schemaName },
  connect_timeout: 3,
});
const userId = randomUUID();
let en: string;
let ja: string;
const toggle = (id: string, user = userId) =>
  toggleAnnouncementLike({
    slug: 'notice',
    displayedVariantId: id,
    userId: user,
  });

// eslint-disable-next-line turbo/no-undeclared-env-vars -- Local DB suite opt-in, not a cached Turbo task
describe.skipIf(process.env.RUN_ANNOUNCEMENT_DB_TESTS !== '1')(
  'announcement reactions in PostgreSQL',
  () => {
    beforeAll(async () => {
      await client`CREATE SCHEMA ${client(schemaName)}`;
      await client`CREATE TABLE announcements (LIKE public.announcements INCLUDING ALL)`;
      await client`CREATE TABLE likes (LIKE public.likes INCLUDING ALL)`;
      state.db = drizzle(client);
    });
    beforeEach(async () => {
      await client`TRUNCATE announcements, likes`;
      const rows = await client`
      INSERT INTO announcements (slug, title, content, locale, status, published_at)
      VALUES ('notice', 'Notice', 'Body', 'en', 'published', now()),
             ('notice', 'Notice', 'Body', 'ja', 'published', now()) RETURNING id`;
      [en, ja] = rows.map((r) => r.id);
    });
    afterAll(async () => {
      await client`DROP SCHEMA ${client(schemaName)} CASCADE`;
      await client.end();
    });

    it('counts readers across locales and unlikes from another locale', async () => {
      await toggle(en);
      await toggle(ja, randomUUID());
      expect(await getAnnouncementLikeMeta('notice', userId)).toEqual({
        likeCount: 2,
        likedByMe: true,
      });
      expect((await getAnnouncementLikeCountsBySlug(['notice'])).get('notice')).toBe(2);
      expect(await toggle(ja)).toEqual({ liked: false, likeCount: 1 });
    });

    it('serializes simultaneous toggles from different locales', async () => {
      const results = await Promise.all([toggle(en), toggle(ja)]);
      expect(results.map((r) => 'liked' in r && r.liked).sort()).toEqual([false, true]);
      expect(await client`SELECT * FROM likes`).toHaveLength(0);
    });

    it('counts legacy duplicates once, then preserves the reaction on deletion', async () => {
      await client`INSERT INTO likes (user_id, target_type, target_id)
      VALUES (${userId}, 'announcement', ${en}), (${userId}, 'announcement', ${ja})`;
      expect(await getAnnouncementLikeMeta('notice')).toEqual({ likeCount: 1, likedByMe: false });
      await deleteAnnouncementWithLikes(en);
      expect(await getAnnouncementLikeMeta('notice', userId)).toEqual({
        likeCount: 1,
        likedByMe: true,
      });
      await deleteAnnouncementWithLikes(ja);
      expect(await client`SELECT * FROM likes`).toHaveLength(0);
    });

    it('cannot leave an orphan when a toggle races deletion', async () => {
      await Promise.all([toggle(en), deleteAnnouncementWithLikes(en)]);
      const orphaned =
        await client`SELECT l.id FROM likes l LEFT JOIN announcements a ON a.id = l.target_id WHERE a.id IS NULL`;
      expect(orphaned).toHaveLength(0);
      expect(await toggle(en)).toEqual({ error: 'notFound' });
    });

    it('serializes deletion of the last two variants', async () => {
      await toggle(en);
      await Promise.all([deleteAnnouncementWithLikes(en), deleteAnnouncementWithLikes(ja)]);
      expect(await client`SELECT * FROM likes`).toHaveLength(0);
    });

    it('rolls back moved likes if deleting the variant fails', async () => {
      await toggle(en);
      await client`CREATE FUNCTION reject_delete() RETURNS trigger LANGUAGE plpgsql AS
      'BEGIN RAISE EXCEPTION ''test deletion failure''; END'`;
      await client`CREATE TRIGGER reject_delete BEFORE DELETE ON announcements FOR EACH ROW EXECUTE FUNCTION reject_delete()`;
      try {
        await expect(deleteAnnouncementWithLikes(en)).rejects.toThrow();
        expect(await client`SELECT target_id FROM likes`).toEqual([{ target_id: en }]);
        expect(await client`SELECT id FROM announcements`).toHaveLength(2);
      } finally {
        await client`DROP TRIGGER reject_delete ON announcements`;
        await client`DROP FUNCTION reject_delete()`;
      }
    });

    it('rejects stale published lookups and mismatched slugs', async () => {
      await client`UPDATE announcements SET status = 'draft' WHERE id = ${en}`;
      expect(await toggle(en)).toEqual({ error: 'notFound' });
      await client`UPDATE announcements SET slug = 'other' WHERE id = ${ja}`;
      expect(await toggle(ja)).toEqual({ error: 'notFound' });
      expect(await client`SELECT * FROM likes`).toHaveLength(0);
    });

    it('rejects a published variant that has no published_at', async () => {
      await client`UPDATE announcements SET published_at = NULL WHERE id = ${en}`;
      expect(await toggle(en)).toEqual({ error: 'notFound' });
      expect(await client`SELECT * FROM likes`).toHaveLength(0);
    });

    it('prevents moving translations into or out of a measured group', async () => {
      await toggle(en);
      expect(await updateAnnouncementPreservingLikes(ja, { slug: 'other' })).toHaveProperty(
        'error'
      );
      const [other] = await client`INSERT INTO announcements (slug, title, content, locale)
      VALUES ('other', 'Other', 'Body', 'es') RETURNING id`;
      expect(await updateAnnouncementPreservingLikes(other.id, { slug: 'notice' })).toHaveProperty(
        'error'
      );
      expect(await updateAnnouncementPreservingLikes(en, { title: 'Edited' })).toBeNull();
    });

    it('preserves anonymised likes when moving to a sibling', async () => {
      await client`INSERT INTO likes (target_type, target_id) VALUES ('announcement', ${en}), ('announcement', ${ja})`;
      await deleteAnnouncementWithLikes(en);
      expect((await getAnnouncementLikeMeta('notice')).likeCount).toBe(2);
    });
  }
);
