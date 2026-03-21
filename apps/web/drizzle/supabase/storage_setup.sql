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
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-images', 'article-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

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
