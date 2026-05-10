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
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Allow authenticated users to upload to their own folder
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update their own files
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own files
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow anyone to read avatars (public bucket)
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
CREATE POLICY "avatars_select_public" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- =============================================================================
-- Article Images Storage Bucket Setup
-- =============================================================================

-- Create the article-images bucket (public so image URLs are accessible without auth)
-- file_size_limit: 5MB, allowed_mime_types: JPEG, PNG, WebP, SVG
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('article-images', 'article-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow anyone to read article images (public bucket)
DROP POLICY IF EXISTS "article_images_select_public" ON storage.objects;
CREATE POLICY "article_images_select_public" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'article-images');

-- Allow admin users to upload article images
DROP POLICY IF EXISTS "article_images_insert_admin" ON storage.objects;
CREATE POLICY "article_images_insert_admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'article-images'
    AND (auth.jwt() ->> 'user_role') = 'admin'
  );

-- Allow admin users to update article images
DROP POLICY IF EXISTS "article_images_update_admin" ON storage.objects;
CREATE POLICY "article_images_update_admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'article-images'
    AND (auth.jwt() ->> 'user_role') = 'admin'
  );

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

-- INSERT: authenticated user may write only into a path matching the
-- canonical layout `${userId-uuid}/${postId-uuid}/${randomUuid}.${ext}`.
-- The regex is byte-for-byte identical to the DB CHECK on
-- post_image_attachments.storage_path and to POST_IMAGE_STORAGE_PATH_REGEX
-- in src/lib/post-images/validation.ts. Without this regex the policy
-- only required the first folder to equal auth.uid(), which let an
-- attacker upload arbitrary bytes to `<uid>/foo.jpg` directly via
-- Supabase REST and create an unbounded user-controlled storage region
-- on the (public) bucket.
--
-- The path-traversal (`..`) and backslash checks are subsumed by the
-- regex (the character set is restricted to `[0-9a-f-/.a-z]`) but are
-- kept here because they read at a glance.
DROP POLICY IF EXISTS "post_images_insert_own" ON storage.objects;
CREATE POLICY "post_images_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
    AND position('..' in name) = 0
    AND position('\' in name) = 0
    AND length(name) <= 256
  );

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
