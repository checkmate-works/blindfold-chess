/**
 * Whether to disable Next.js Image Optimization for Supabase Storage URLs.
 *
 * Background: Next.js Image Optimization rejects private IPs (e.g.
 * `127.0.0.1`, `localhost`) as image sources to prevent SSRF. During local
 * development the Supabase API runs on `http://127.0.0.1:54321` and serves
 * Storage public objects from the same host, so all such `<Image>` would
 * fail to load if optimization were left on.
 *
 * In production the Supabase project URL is a public hostname, so
 * optimization works normally and we want WebP/AVIF + srcset.
 *
 * Use this flag with `<Image unoptimized={IS_LOCAL_SUPABASE} ... />` for
 * any image whose `src` is a Supabase Storage URL (avatars, post-attached
 * images, article images, etc.).
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

export const IS_LOCAL_SUPABASE: boolean = (() => {
  if (!supabaseUrl) return false;
  try {
    const url = new URL(supabaseUrl);
    return url.hostname === '127.0.0.1' || url.hostname === 'localhost';
  } catch {
    return false;
  }
})();
