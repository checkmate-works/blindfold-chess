import { negotiateLocale } from '@/i18n/negotiate-locale';

import { decodeGameShortId } from '@/lib/games/short-id';
import { UUID_RE } from '@/lib/validations/uuid';

/**
 * Short share link for a public game: `/g/<code>` → 301 →
 * `/{locale}/games/shared/{id}`.
 *
 * Two things get shorter here. The `<code>` is the game UUID in base64url
 * (see `short-id.ts`), and the locale segment is gone — together taking the
 * copied link from 87 characters to 59.
 *
 * Dropping the locale is not only about length: the canonical URL bakes in
 * whichever locale the *sharer* was browsing, so a link shared from `/ja/`
 * opened a Japanese page for an English-speaking recipient. This route
 * resolves the locale from the recipient's own `Accept-Language` instead.
 *
 * The redirect targets the canonical page, which stays the only indexed URL —
 * `/g/` appears in no `canonical`, sitemap, or `hreflang`. Social crawlers
 * (Twitterbot, Slack, Discord) follow it, so OG cards and the generated OG
 * image still resolve.
 *
 * A raw UUID is accepted too, so a hand-written `/g/<uuid>` also works.
 * Whether the game exists is NOT checked here — that would cost a DB query on
 * every redirect just to duplicate the `notFound()` the destination page
 * already does.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const id = UUID_RE.test(code) ? code.toLowerCase() : decodeGameShortId(code);
  const locale = negotiateLocale(request.headers.get('accept-language'));

  // A malformed code has no game behind it. Send it to the public games list
  // (temporarily — the code itself is not a permanent alias for that list)
  // rather than 404ing a link that a chat client may simply have truncated.
  const destination = id ? `/${locale}/games/shared/${id}` : `/${locale}/games/shared`;

  return new Response(null, {
    status: id ? 301 : 302,
    headers: {
      // Relative to the request so this works on localhost and preview
      // deployments, not just the production origin.
      Location: new URL(destination, request.url).toString(),
      // The destination depends on the request's language, so this redirect
      // must not be pinned — a browser caches a bare 301 indefinitely, and a
      // shared cache would hand one visitor's locale to everyone else.
      'Cache-Control': 'no-store',
      Vary: 'Accept-Language',
    },
  });
}
