'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

/**
 * Subset of `post_game_embed_attachments` columns that the card needs.
 *
 * @design Component contract
 *
 * `AttachedEmbedCard` MUST only ever be rendered for attachments whose
 * parent topic_post is non-soft-deleted. The visibility rule is enforced
 * by (a) the RLS SELECT policy on `post_game_embed_attachments`, (b) the
 * application-layer query that filters `topic_posts.deleted_at IS NULL`,
 * and (c) this contract — three layers of defense, mirroring the PGN
 * card's posture (SPEC1 §5-1).
 *
 * @design iframe src reconstruction
 *
 * The iframe `src` is rebuilt server-side from `(embedProvider, embedId)`.
 * The persisted `source_url` column is NEVER read into the rendered
 * `src` attribute — `embedId` is regex-validated at write time AND by
 * the DB CHECK, so reconstructing the URL from it makes the rendered
 * src provably safe regardless of what the row carries (D8 #33).
 *
 * @design iframe sandbox is a string literal
 *
 * The `sandbox` attribute value is a STRING LITERAL per provider, not a
 * dynamically built expression. This is deliberate: the SecurityEngineer
 * Phase 1 baseline (D1) pinned the exact sandbox values, and the Tester
 * suite (#30/#31) verifies them by static-source equality. A future
 * change to these values is therefore a deliberate edit to the literal
 * here, with a corresponding test update.
 *
 * @design postMessage handler — DEFER
 *
 * Phase B does NOT install a `window.addEventListener('message', ...)`
 * listener (D3 — dead code reduction + smaller attack surface). If a
 * future feature needs to consume Lichess embed move events, the
 * listener MUST pin origin: `if (event.origin !== 'https://lichess.org') return;`
 * — never `'*'`, never substring match, never `endsWith('lichess.org')`.
 * It must also validate `event.source === iframeRef.current?.contentWindow`
 * and treat `event.data` as untrusted input.
 */
export type AttachedEmbedCardData = {
  id: string;
  embedProvider: string; // 'chesscom' | 'lichess'
  embedId: string;
  attributionPlatform: string | null;
  attributionPath: string | null;
};

type Props = {
  attachment: AttachedEmbedCardData;
};

export function AttachedEmbedCard({ attachment }: Props) {
  const t = useTranslations('attachment');

  if (attachment.embedProvider === 'chesscom') {
    return (
      <div className="mt-2 mb-2 rounded-md border border-border bg-card overflow-hidden">
        <div className="p-3 space-y-2">
          <p className="text-sm font-medium text-foreground">{t('embed.chesscomCardTitle')}</p>
          {/* aspect-square: chess.com emboard renders an 8x8 board (square).
              Manual verification step (deferred to merge): confirm that the
              chess.com emboard fits the square frame at the chosen width
              breakpoints; if there is a controls bar that pushes the layout
              out of square, revisit. */}
          <div className="aspect-square w-full">
            {/*
              sandbox token rationale (chess.com):
                - allow-scripts: required so the embed can run its own
                  JavaScript (board rendering).
                - allow-same-origin: required so the embed document is
                  treated as living at its real origin (www.chess.com)
                  rather than as a "null origin" sandboxed document.
                  Without it, the chess.com emboard breaks at boot:
                  it is a Vue + pinia app whose state-management layer
                  unconditionally reads/writes localStorage during
                  initialization, and a null-origin document throws
                  SecurityError on any localStorage access. It also
                  fetches its own /manifest.json from www.chess.com,
                  which a null-origin document is blocked from doing
                  by CORS. The result was a fully blank emboard.
                  See the Lichess block below for the full safety
                  argument — the same reasoning applies here: parent
                  (our site) and iframe (chess.com) are different
                  origins, so MDN's "do not combine allow-scripts and
                  allow-same-origin" warning (which is about same-
                  origin iframes that could clear their own sandbox)
                  does not apply.
                  Phase B M-2 history note: the original SecurityEngineer
                  baseline omitted allow-same-origin; live testing showed
                  the embed cannot initialize without it.

              The chess.com emboard is a static diagram with no
              "open in new tab" affordance, so neither allow-popups
              nor allow-popups-to-escape-sandbox are needed (unlike
              the Lichess case below).
            */}
            <iframe
              src={`https://www.chess.com/emboard?id=${attachment.embedId}`}
              sandbox="allow-scripts allow-same-origin"
              referrerPolicy="no-referrer"
              loading="lazy"
              title="Chess.com diagram embed"
              className="w-full h-full border-0"
            />
          </div>
        </div>
      </div>
    );
  }

  if (attachment.embedProvider === 'lichess') {
    // Lichess attribution. `attribution_path` is auto-derived as
    // `/{embedId}` at write time per Q2, so this resolves to
    // `https://lichess.org/{embedId}` — safe per D7 (rebuild from
    // validated components, never use persisted source_url as href).
    //
    // Defense in depth: even though the writer always sets
    // attributionPath to `/${embedId}`, we still cross-check that the
    // path matches that shape before rendering. A drifted DB row with a
    // surprise path will fall back to no attribution link rather than
    // becoming a clickable link to wherever.
    const expectedPath = `/${attachment.embedId}`;
    const lichessHref =
      attachment.attributionPlatform === 'lichess' && attachment.attributionPath === expectedPath
        ? `https://lichess.org${expectedPath}`
        : null;

    return (
      <div className="mt-2 mb-2 rounded-md border border-border bg-card overflow-hidden">
        <div className="p-3 space-y-2">
          <p className="text-sm font-medium text-foreground">{t('embed.lichessCardTitle')}</p>
          <div className="aspect-video w-full">
            {/*
              sandbox token rationale (SecurityEngineer Phase A finding M-2):
                - allow-scripts: required so the embed can run its own
                  JavaScript (board rendering + interaction).
                - allow-same-origin: required so the embed document is
                  treated as living at its real origin (lichess.org)
                  rather than as a "null origin" sandboxed document.
                  Without it, the Lichess embed renders the board but
                  the embed app cannot read/write its own
                  localStorage / sessionStorage and cannot fetch
                  same-origin resources from lichess.org — the browser
                  console showed `Failed to read 'localStorage' ...
                  document is sandboxed and lacks the
                  'allow-same-origin' flag` and `Unsafe attempt to
                  load URL https://lichess.org/embed/... from frame
                  with URL https://lichess.org/embed/...` (the embed
                  trying to fetch its own origin while running as
                  null-origin). The board appeared to work but the
                  page was internally half-broken.
                  Phase B M-2 history note: the original
                  SecurityEngineer baseline omitted allow-same-origin
                  because it was not needed for board rendering alone;
                  live testing surfaced the half-broken state and
                  added allow-same-origin to the allowlist. This
                  aligns with SPEC2 §17 (#75)'s embed recommendation
                  of `sandbox="allow-scripts allow-same-origin"` as
                  the minimum-viable embed sandbox.
                - allow-popups: required so links inside the embed (e.g.
                  "open this game on Lichess.org") can open at all.
                - allow-popups-to-escape-sandbox: trade-off. A script
                  inside the iframe can `window.open()` a URL, and the
                  resulting popup is itself UNsandboxed — i.e. the new
                  tab renders Lichess's full UI without inheriting our
                  sandbox restrictions. We accept this because (a) the
                  rendered URL is a trusted origin (lichess.org), (b)
                  the user-facing UX of "open in new tab" requires an
                  unsandboxed page to look/behave like the user expects,
                  and (c) the embedId is regex-validated at write time
                  by `parseLichessEmbedUrl` to the canonical Lichess
                  8-char game-ID shape (`^[A-Za-z0-9]{8}$`, see
                  `apps/web/src/lib/games/parse-embed-url.ts`) AND
                  backstopped by the DB CHECK `^[A-Za-z0-9_-]{1,64}$`
                  on `post_game_embed_attachments.embed_id`, so the
                  substring interpolated into the iframe `src` cannot
                  contain URL-special characters and we only ever embed
                  `lichess.org/embed/<8-alnum>`.
                  Residual risk: a supply-chain compromise of Lichess's
                  served scripts could open arbitrary unsandboxed pages
                  via window.open from inside the iframe.

              Safety of `allow-scripts` + `allow-same-origin` together:
              MDN warns that these two tokens combined "effectively
              remove the sandbox" — but that warning targets the case
              where the iframe document is served from the SAME origin
              as the parent (a same-origin script can call
              `parent.document.querySelector('iframe').sandbox = ''`
              and clear the sandbox attribute on itself). Our embeds
              are CROSS-ORIGIN (parent on `localhost` /
              `blindfold-chess.app`, iframe on `lichess.org` /
              `www.chess.com`), so the cross-origin Same-Origin Policy
              keeps the iframe walled off from our document object —
              the MDN warning does not apply. `allow-same-origin` here
              only re-enables the iframe's access to ITS OWN origin
              (its own localStorage, its own /manifest.json), which
              the parent never had access to in the first place.
              Comparison: `allow-popups-to-escape-sandbox` (already
              accepted on this iframe) is a strictly broader privilege
              than `allow-same-origin` — it lets the iframe spawn
              arbitrary unsandboxed top-level windows, whereas
              `allow-same-origin` only restores intra-iframe behavior.
              If we accept the former, accepting the latter is
              consistent.

              Asymmetry vs. the chess.com iframe above (which uses
              `sandbox="allow-scripts allow-same-origin"` without the
              popup tokens): the chess.com emboard is a static diagram
              with no "open in new tab" affordance, so neither
              allow-popups nor escape-sandbox are needed. The Lichess
              embed is a full game-replay UI whose pop-out flow is
              part of the expected UX, hence the wider sandbox.
            */}
            <iframe
              src={`https://lichess.org/embed/${attachment.embedId}?theme=auto&bg=auto`}
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer"
              loading="lazy"
              title="Lichess game replay"
              className="w-full h-full border-0"
            />
          </div>
          {lichessHref && (
            <p className="text-xs text-muted-foreground pt-1">
              <a
                href={lichessHref}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-link-primary hover:underline"
              >
                {t('embed.viewOnLichess')}
              </a>
            </p>
          )}
        </div>
      </div>
    );
  }

  // Unknown provider — render nothing. The DB CHECK constrains
  // embed_provider to 'chesscom' | 'lichess', so this branch is
  // unreachable in practice; surfacing nothing is the safest fallback.
  return null;
}
