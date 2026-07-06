/** Supabase Storage bucket holding admin-uploaded ad creative images. */
export const AD_CREATIVES_BUCKET = 'ad-creatives';

/**
 * Recover the in-bucket storage path from a Supabase public URL so an
 * uploaded avatar can be removed on delete/replace. Returns null when the
 * URL doesn't point into our bucket (e.g. a manually-entered external URL),
 * in which case there is nothing of ours to clean up.
 */
export function storagePathFromPublicUrl(publicUrl: string): string | null {
  const marker = `/${AD_CREATIVES_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  const path = publicUrl.slice(idx + marker.length);
  return path.length > 0 ? decodeURIComponent(path) : null;
}
