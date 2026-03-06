-- Avatars Storage Bucket Setup
-- This file creates and configures the 'avatars' bucket in Supabase Storage
-- with appropriate RLS policies for avatar upload/management.
--
-- This file is automatically applied by scripts/migrate.ts on Supabase environments.

-- Create the avatars bucket (public so avatar URLs are accessible without auth)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
DO $$ BEGIN
  CREATE POLICY "avatars_insert_own" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'avatars'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Allow authenticated users to update their own files
DO $$ BEGIN
  CREATE POLICY "avatars_update_own" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = 'avatars'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Allow authenticated users to delete their own files
DO $$ BEGIN
  CREATE POLICY "avatars_delete_own" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'avatars'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Allow anyone to read avatars (public bucket)
DO $$ BEGIN
  CREATE POLICY "avatars_select_public" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
