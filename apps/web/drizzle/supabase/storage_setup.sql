-- Avatars Storage Bucket Setup
-- This file creates and configures the 'avatars' bucket in Supabase Storage
-- with appropriate RLS policies for avatar upload/management.
--
-- This file is automatically applied by scripts/migrate.ts on Supabase environments.
--
-- All statements are convergent-idempotent (safe to run multiple times).
-- Re-running will update bucket settings and recreate policies to match
-- the expected definitions, correcting any configuration drift.

-- Create the avatars bucket (public so avatar URLs are accessible without auth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Image writes are service-role only. Session JWTs must not bypass the API's
-- byte-signature checks, re-encoding, ban checks or rate limits. MIME metadata
-- supplied to Storage is not proof of the actual file format.
-- Explicit drops also close policies installed by earlier deployments.
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;

-- Allow anyone to read avatars (public bucket)
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
CREATE POLICY "avatars_select_public" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- =============================================================================
-- Article Images Storage Bucket Setup
-- =============================================================================

-- Create the article-images bucket (public so image URLs are accessible without auth)
-- file_size_limit: 5MB, allowed_mime_types: JPEG, PNG, WebP
-- SVG is intentionally excluded: SVG can embed <script> and event handlers, and when served
-- directly from the *.supabase.co origin, navigation to the URL executes scripts. Combined with
-- an admin CSRF vector, this would enable stored XSS on the Storage origin. TipTap only uses
-- raster formats, so SVG is not needed. See also apps/web/.../images/image-validation.ts.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('article-images', 'article-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow anyone to read article images (public bucket)
DROP POLICY IF EXISTS "article_images_select_public" ON storage.objects;
CREATE POLICY "article_images_select_public" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'article-images');

-- Article uploads and replacements go through the validating admin API.
DROP POLICY IF EXISTS "article_images_insert_admin" ON storage.objects;

-- Withdraw the legacy direct-update policy too.
DROP POLICY IF EXISTS "article_images_update_admin" ON storage.objects;

-- Allow admin users to delete article images
DROP POLICY IF EXISTS "article_images_delete_admin" ON storage.objects;
CREATE POLICY "article_images_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'article-images'
    AND (auth.jwt() ->> 'user_role') = 'admin'
  );

-- =============================================================================
-- Post Images Storage Bucket Setup
-- =============================================================================
-- Public bucket for user-uploaded images attached to topic_posts.
-- file_size_limit: 2MB per image (the DB CHECK on
-- post_image_attachments.file_size enforces the same cap).
-- allowed_mime_types: JPEG, PNG, WebP. SVG is intentionally excluded
-- (XSS / script-injection vector — see post_image_attachments TSDoc).
-- Path layout enforced by RLS + DB CHECK: ${userId}/${postId}/${randomUuid}.${ext}.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('post-images', 'post-images', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- SELECT: gated on existence of a non-soft-deleted parent topic_post.
-- Plain `bucket_id = 'post-images'` would let anonymous users LIST the
-- bucket and enumerate every leaf UUID (including images of soft-deleted
-- posts that have not yet been swept by the 7-day reaper). Joining
-- storage.objects.name -> post_image_attachments.storage_path -> topic_posts
-- couples the public read to the same lifecycle as the DB row: a
-- soft-deleted post's images become un-fetchable immediately, and LIST
-- traversal returns zero rows because no row matches a directory prefix.
-- The lookup is O(log n) via the unique index on storage_path created
-- in the post_image_attachments migration.
DROP POLICY IF EXISTS "post_images_select_public" ON storage.objects;
CREATE POLICY "post_images_select_public" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'post-images'
    AND EXISTS (
      SELECT 1
      FROM post_image_attachments pia
      JOIN topic_posts p ON p.id = pia.post_id
      WHERE pia.storage_path = storage.objects.name
        AND p.deleted_at IS NULL
    )
  );

-- Only the validated image API may upload, using its service-role client.
-- A path regex alone cannot validate the bytes a session uploads directly.
DROP POLICY IF EXISTS "post_images_insert_own" ON storage.objects;

-- DELETE: authenticated user may delete only objects under their own folder.
-- Used by the post-deletion best-effort cleanup and the daily reaper
-- (running under the user-session client when the user is the deleter,
-- under the service role client when the reaper is the deleter — service
-- role bypasses RLS).
DROP POLICY IF EXISTS "post_images_delete_own" ON storage.objects;
CREATE POLICY "post_images_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- No UPDATE policy: post images are immutable once uploaded (mirrors
-- the post_game_*_attachments policy posture).

-- =============================================================================
-- Ad Creatives Storage Bucket Setup
-- =============================================================================
-- Public bucket for admin-uploaded ad creative images (e.g. the in-feed
-- native card avatar). Mirrors the article-images posture: public read so
-- image URLs resolve without auth, admin-only write. file_size_limit: 5MB,
-- allowed_mime_types: JPEG, PNG, WebP. SVG is intentionally excluded (SVG can
-- embed <script> / event handlers and would execute when navigated to on the
-- *.supabase.co origin — see article-images note above).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ad-creatives', 'ad-creatives', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow anyone to read ad creative images (public bucket)
DROP POLICY IF EXISTS "ad_creatives_select_public" ON storage.objects;
CREATE POLICY "ad_creatives_select_public" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'ad-creatives');

-- Uploads and replacements require the validating admin API.
DROP POLICY IF EXISTS "ad_creatives_insert_admin" ON storage.objects;

-- Withdraw the legacy direct-update policy too.
DROP POLICY IF EXISTS "ad_creatives_update_admin" ON storage.objects;

-- Allow admin users to delete ad creative images
DROP POLICY IF EXISTS "ad_creatives_delete_admin" ON storage.objects;
CREATE POLICY "ad_creatives_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'ad-creatives'
    AND (auth.jwt() ->> 'user_role') = 'admin'
  );

-- =============================================================================
-- Game GIFs Storage Bucket Setup
-- =============================================================================
-- Public bucket for generated "game replay" GIFs, cached at
-- gifs/${gameId}/${variant}.gif (variant: 'plain' | 'played'). Written only by
-- the /api/games/[id]/gif route handler via the service-role client (which
-- bypasses RLS entirely) — there is deliberately no INSERT/UPDATE/DELETE
-- policy for `authenticated`/`anon` here.
-- file_size_limit: 15MB (X's own attachment cap; real output is ~1-3MB).
-- allowed_mime_types: GIF only.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('game-gifs', 'game-gifs', true, 15728640, ARRAY['image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow anyone to read game GIFs (public bucket)
DROP POLICY IF EXISTS "game_gifs_select_public" ON storage.objects;
CREATE POLICY "game_gifs_select_public" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'game-gifs');
