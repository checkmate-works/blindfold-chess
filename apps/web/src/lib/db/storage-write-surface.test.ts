import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

// These policies are reapplied by migrate.ts on existing databases too.
// Removing CREATE alone would leave a previously deployed policy active.
const sql = readFileSync(
  join(__dirname, '../../../drizzle/supabase/storage_setup.sql'),
  'utf8'
).replace(/--[^\n]*/g, '');

describe('Storage image validation boundary', () => {
  it('does not grant direct uploads or replacements to client roles', () => {
    const policies = [
      ...sql.matchAll(/CREATE\s+POLICY\s+"[^"]+"\s+ON\s+storage\.objects\s+([^;]+);/gi),
    ];
    expect(policies.length).toBeGreaterThan(0);
    for (const [, body] of policies) {
      // An omitted FOR means ALL, which would reopen the upload bypass.
      expect(body).toMatch(/\bFOR\s+(SELECT|DELETE)\b/i);
    }
  });

  it.each([
    'avatars_insert_own',
    'avatars_update_own',
    'avatars_delete_own',
    'post_images_insert_own',
    'article_images_insert_admin',
    'article_images_update_admin',
    'ad_creatives_insert_admin',
    'ad_creatives_update_admin',
  ])('withdraws the previously deployed %s policy', (name) => {
    expect(sql).toContain(`DROP POLICY IF EXISTS "${name}" ON storage.objects;`);
  });
});
