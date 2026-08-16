/**
 * Subset of `post_video_attachments` columns the card needs.
 *
 * @design Component contract
 *
 * `AttachedVideoCard` MUST only ever be rendered for attachments whose
 * parent `topic_post` is non-soft-deleted. The visibility rule is
 * enforced by (a) the RLS SELECT policy on `post_video_attachments`,
 * (b) the application-layer query that filters
 * `topic_posts.deleted_at IS NULL`, and (c) this contract — three
 * layers of defense, mirroring `AttachedEmbedCard`.
 *
 * @design iframe `src` reconstruction (issue #75 H-6)
 *
 * The iframe `src` is rebuilt server-side from
 * `(provider, providerVideoId)` via the privacy-enhanced
 * `youtube-nocookie.com` host. The persisted `source_url` column is
 * NEVER read into the rendered `src`; `providerVideoId` is regex-
 * validated at write time by `parseYouTubeUrl` AND backstopped by the
 * DB CHECK `^[A-Za-z0-9_-]{11}$`, so reconstructing the URL from it
 * makes the rendered src provably safe regardless of what the row
 * carries.
 *
 * @design iframe `sandbox` is a string literal
 *
 * The `sandbox` attribute is the literal `"allow-scripts allow-same-origin"`
 * — this exact value, for these reasons (#75):
 *   - `allow-scripts`: required for the YouTube embed JS player.
 *   - `allow-same-origin`: required so the player can read its own
 *     localStorage entries (volume / playback rate persistence). The
 *     embed origin is `youtube-nocookie.com`, not the parent origin,
 *     so this token does not give the iframe access to the parent's
 *     storage or cookies.
 * The spec's original `allow-presentation` was deliberately dropped —
 * presentation API is unrelated to fullscreen, which is delegated to
 * the `allow="fullscreen ..."` attribute below.
 *
 * `allow-top-navigation` / `allow-popups` / `allow-popups-to-escape-sandbox`
 * are intentionally NOT included to prevent the iframe from
 * navigating the parent or opening unsandboxed popups.
 *
 * @design `allow` attribute (Permissions Policy delegation)
 *
 * The `allow` attribute delegates Permissions Policy features to the
 * iframe origin. We grant the minimum set needed by the YouTube
 * player UI: `fullscreen` (the fullscreen button), `picture-in-picture`
 * (PiP control), `encrypted-media` (DRM playback), `accelerometer` and
 * `gyroscope` (mobile motion controls). Camera, microphone, geolocation,
 * and payment are explicitly NOT delegated.
 */
export type AttachedVideoCardData = {
  id: string;
  provider: string; // 'youtube' (MVP)
  providerVideoId: string;
  /**
   * Optional human-supplied or oEmbed-derived title. MVP persists
   * `null` (oEmbed is deferred — see issue #75); the renderer falls
   * back to a localized static title for a11y.
   */
  title: string | null;
};

type Props = {
  attachment: AttachedVideoCardData;
  /**
   * Localized fallback title for the iframe `title` attribute when the
   * attachment carries `title === null`. Passed in by the parent so this
   * component remains a Server Component; the parent owns the
   * translation lookup.
   */
  fallbackTitle: string;
};

const YOUTUBE_NOCOOKIE_HOST = 'https://www.youtube-nocookie.com';
const YOUTUBE_THUMBNAIL_HOST = 'https://img.youtube.com';

export function AttachedVideoCard({ attachment, fallbackTitle }: Props) {
  if (attachment.provider !== 'youtube') {
    // Unknown provider — render nothing. The DB CHECK constrains
    // `provider` to `'youtube'`, so this branch is unreachable in
    // practice; the safe-fallback behavior is pinned anyway.
    return null;
  }

  const embedSrc = `${YOUTUBE_NOCOOKIE_HOST}/embed/${attachment.providerVideoId}`;
  const thumbnailUrl = `${YOUTUBE_THUMBNAIL_HOST}/vi/${attachment.providerVideoId}/hqdefault.jpg`;
  const title = attachment.title ?? fallbackTitle;

  return (
    <div className="mt-2 mb-2 rounded-md border border-border bg-card overflow-hidden">
      <div className="aspect-video w-full">
        <iframe
          src={embedSrc}
          sandbox="allow-scripts allow-same-origin"
          allow="fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
          allowFullScreen
          referrerPolicy="no-referrer"
          loading="lazy"
          title={title}
          // The poster image is the canonical YouTube CDN thumbnail
          // derived from `providerVideoId`. Browsers ignore `poster`
          // on iframes, but we keep the URL accessible to caching
          // layers / SEO via a hidden link element below if a future
          // change wants to expose it. For now, the thumbnail URL is
          // referenced as a `data-thumbnail` attribute so the value is
          // discoverable at audit time without affecting the rendered
          // page weight.
          data-thumbnail={thumbnailUrl}
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}
