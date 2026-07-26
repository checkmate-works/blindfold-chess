import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AttachedGameCardData } from './AttachedGameCard';
import { AttachedGameCard } from './AttachedGameCard';

afterEach(() => {
  cleanup();
});

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
}));

// MiniBoard pulls in chess-pieces / icons / GamePreferencesContext, none of
// which are relevant here. Stub it to a marker div so we can assert
// "thumbnail rendered" without exercising the chessboard rendering stack.
vi.mock('@/lib/positions/ui/MiniBoard', () => ({
  MiniBoard: ({ fen }: { fen: string }) => <div data-testid="mini-board" data-fen={fen} />,
}));

// next/dynamic returns a stub that simply renders a placeholder. The lazy
// chess-core load is irrelevant for the structural / a11y / DOM tests
// here — what matters is that the summary card itself does not depend
// on chess-core at module-import time (verified separately further below).
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const Stub = () => <div data-testid="lazy-replay-stub" />;
    return Stub;
  },
}));

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function makeAttachment(overrides: Partial<AttachedGameCardData> = {}): AttachedGameCardData {
  return {
    id: 'att-1',
    source: 'pgn',
    sourceUrl: null,
    sourceGameId: null,
    pgn: '[Event "x"]\n\n1. e4 e5',
    moveCount: 2,
    headerWhite: 'Alice',
    headerBlack: 'Bob',
    headerResult: '*',
    headerEvent: 'Test Cup',
    headerSite: null,
    headerDate: '2026.04.27',
    anonymized: false,
    attributionPlatform: null,
    attributionPath: null,
    finalFen: STARTING_FEN,
    ...overrides,
  };
}

describe('AttachedGameCard — DOM / a11y structure', () => {
  it('does NOT nest a <button> inside an <a> (M1 a11y fix verification)', () => {
    // Per BaseTopicPostCard's design, the click-to-detail <a> is a
    // sibling of `extraContent` (the AttachedGameCard). The card must
    // therefore never render its own interactive children inside an
    // anchor — even self-contained ones — so the rule "no button in
    // a link" must hold for the card on its own.
    const { container } = render(<AttachedGameCard attachment={makeAttachment()} />);
    expect(container.querySelectorAll('a button')).toHaveLength(0);
  });

  it('renders a thumbnail with the precomputed final FEN', () => {
    const att = makeAttachment({ finalFen: STARTING_FEN });
    const { getByTestId } = render(<AttachedGameCard attachment={att} />);
    const board = getByTestId('mini-board');
    expect(board.getAttribute('data-fen')).toBe(STARTING_FEN);
  });

  it('routes a [Site] PGN URL through the cushion redirect page (#84)', () => {
    // The Site header was originally rendered as plain text over phishing
    // concerns. The cushion redirect (`/[locale]/redirect?url=...`) added
    // later by #84 surfaces the destination URL
    // before navigation, mitigating the original phishing concern,
    // so external Site URLs are now rendered as cushion-routed
    // anchors instead of plain text.
    const att = makeAttachment({
      source: 'pgn',
      headerSite: 'https://lichess.org/abcd1234',
    });
    const { container } = render(<AttachedGameCard attachment={att} />);

    const anchors = Array.from(container.querySelectorAll('a'));
    const siteAnchor = anchors.find(
      (a) =>
        (a.getAttribute('href') ?? '').startsWith('/en/redirect?url=') &&
        decodeURIComponent(a.getAttribute('href')!.split('?url=')[1]).includes(
          'lichess.org/abcd1234'
        )
    );
    expect(siteAnchor).toBeDefined();
    // The cushion link must NOT echo the raw external URL as href, and
    // must carry standard cross-origin link hardening.
    const rel = siteAnchor?.getAttribute('rel') ?? '';
    expect(rel).toContain('noopener');
    expect(rel).toContain('noreferrer');
    expect(rel).toContain('nofollow');
    // The visible label is the original URL — the redirection is
    // mechanical (href), not visible.
    expect(siteAnchor?.textContent).toBe('https://lichess.org/abcd1234');
  });

  it('renders a non-URL [Site] header as inert text (no anchor)', () => {
    // PGN spec allows free-form Site values (e.g. `Site "Internet"`).
    // Anything that does not parse as a real URL must NOT become an
    // anchor — there is no destination to route through the cushion
    // page.
    const att = makeAttachment({
      source: 'pgn',
      headerSite: 'Internet',
    });
    const { container } = render(<AttachedGameCard attachment={att} />);
    expect(container.textContent).toContain('Internet');
    const anchors = Array.from(container.querySelectorAll('a'));
    const internetAnchor = anchors.find((a) => (a.getAttribute('href') ?? '').includes('Internet'));
    expect(internetAnchor).toBeUndefined();
  });

  it('renders a dangerous-scheme [Site] header as inert text (XSS defense)', () => {
    // `javascript:` / `data:` / similar must never become anchors,
    // even via the cushion redirect (the cushion validates schemes
    // server-side too, but defense-in-depth pins this at the
    // renderer).
    const att = makeAttachment({
      source: 'pgn',
      headerSite: 'javascript:alert(1)',
    });
    const { container } = render(<AttachedGameCard attachment={att} />);
    const anchors = Array.from(container.querySelectorAll('a'));
    const evil = anchors.find((a) => (a.getAttribute('href') ?? '').includes('javascript'));
    expect(evil).toBeUndefined();
  });

  it('renders a chess.com attribution link rebuilt from attribution_path (NOT from sourceUrl), routed through the cushion page', () => {
    // The persisted sourceUrl is intentionally a hostile string to
    // verify the renderer never reads it back as an href. Only the
    // (platform, path) pair drives the rendered link, and the
    // canonical chess.com URL is then routed through
    // /[locale]/redirect?url=... so the user sees the destination
    // before navigating.
    const att = makeAttachment({
      source: 'pgn',
      sourceUrl: 'https://evil.tld/payload',
      attributionPlatform: 'chesscom',
      attributionPath: '/game/live/12345',
    });
    const { container } = render(<AttachedGameCard attachment={att} />);

    const anchors = Array.from(container.querySelectorAll('a'));
    const cushionedChesscom = anchors.find(
      (a) =>
        (a.getAttribute('href') ?? '').startsWith('/en/redirect?url=') &&
        decodeURIComponent(a.getAttribute('href')!.split('?url=')[1]) ===
          'https://www.chess.com/game/live/12345'
    );
    expect(cushionedChesscom).toBeDefined();
    const rel = cushionedChesscom?.getAttribute('rel') ?? '';
    expect(rel).toContain('noopener');
    expect(rel).toContain('noreferrer');
    expect(rel).toContain('nofollow');

    // The hostile sourceUrl must not have produced an anchor — neither
    // directly nor inside a cushion href.
    const evilAnchor = anchors.find((a) => (a.getAttribute('href') ?? '').includes('evil.tld'));
    expect(evilAnchor).toBeUndefined();
  });

  it('does NOT render a chess.com attribution link when the platform/path pair is null', () => {
    // Pure PGN attachment (no off-platform attribution) — no chess.com
    // anchor should appear.
    const att = makeAttachment({
      source: 'pgn',
      attributionPlatform: null,
      attributionPath: null,
    });
    const { container } = render(<AttachedGameCard attachment={att} />);
    const anchors = Array.from(container.querySelectorAll('a'));
    expect(
      anchors.find((a) => (a.getAttribute('href') ?? '').includes('chess.com'))
    ).toBeUndefined();
  });

  it('renders the Lichess Source row inside the metadata column, routed through the cushion page', () => {
    // Lichess attachments build the canonical URL from `sourceGameId`
    // and route it through /[locale]/redirect?url=... — same posture
    // as the PGN [Site] header so both attachment kinds carry a
    // single, consistent outbound-link UX.
    const att = makeAttachment({
      source: 'lichess',
      sourceGameId: 'abcd1234',
      sourceUrl: 'https://lichess.org/abcd1234',
      headerSite: 'https://malicious.example/?x=1',
    });
    const { container } = render(<AttachedGameCard attachment={att} />);

    const anchors = Array.from(container.querySelectorAll('a'));
    const cushionedLichess = anchors.find(
      (a) =>
        (a.getAttribute('href') ?? '').startsWith('/en/redirect?url=') &&
        decodeURIComponent(a.getAttribute('href')!.split('?url=')[1]) ===
          'https://lichess.org/abcd1234'
    );
    expect(cushionedLichess).toBeDefined();
    expect(cushionedLichess?.textContent).toBe('lichess.org/abcd1234');
    const rel = cushionedLichess?.getAttribute('rel') ?? '';
    expect(rel).toContain('noopener');
    expect(rel).toContain('noreferrer');
    expect(rel).toContain('nofollow');

    // The hostile [Site] header value must NOT have been linked —
    // Lichess attachments do not surface a Site row, only a Source
    // row built from the validated sourceGameId.
    const evilAnchor = anchors.find((a) =>
      (a.getAttribute('href') ?? '').includes('malicious.example')
    );
    expect(evilAnchor).toBeUndefined();
  });

  it('does NOT render a Site row for source=lichess (Source row supersedes it)', () => {
    // Lichess attachments use the Source row (rebuilt from
    // sourceGameId) as the canonical outbound pointer. The PGN [Site]
    // header is suppressed for Lichess because it would duplicate the
    // Source row at best, and at worst surface a hostile-but-shaped
    // value (sourceUrl is rebuilt server-side; headerSite is not).
    const att = makeAttachment({
      source: 'lichess',
      sourceGameId: 'abcd1234',
      headerSite: 'https://lichess.org/abcd1234',
    });
    const { container } = render(<AttachedGameCard attachment={att} />);
    expect(container.textContent).not.toContain('card.headerSite');
  });

  it('shows the anonymized note only when attachment.anonymized=true', () => {
    const { queryByText: queryWith } = render(
      <AttachedGameCard attachment={makeAttachment({ anonymized: true })} />
    );
    expect(queryWith('card.anonymizedNote')).not.toBeNull();

    cleanup();

    const { queryByText: queryWithout } = render(
      <AttachedGameCard attachment={makeAttachment({ anonymized: false })} />
    );
    expect(queryWithout('card.anonymizedNote')).toBeNull();
  });

  it('renders the player names and result row', () => {
    const att = makeAttachment({
      headerWhite: 'Alice',
      headerBlack: 'Bob',
      headerResult: '1-0',
    });
    const { container } = render(<AttachedGameCard attachment={att} />);
    const text = container.textContent ?? '';
    expect(text).toContain('Alice');
    expect(text).toContain('Bob');
    // result "1-0" is shown when not '*'
    expect(text).toContain('1-0');
  });

  it('does NOT render the [Event] header anymore (#84 metadata cleanup)', () => {
    const att = makeAttachment({
      headerEvent: 'rated rapid game',
    });
    const { container } = render(<AttachedGameCard attachment={att} />);
    const text = container.textContent ?? '';
    expect(text).not.toContain('rated rapid game');
    expect(text).not.toContain('card.headerEvent');
  });

  it('hides the result span when result is "*"', () => {
    const att = makeAttachment({
      headerResult: '*',
      headerWhite: 'Alice',
      headerBlack: 'Bob',
    });
    const { container } = render(<AttachedGameCard attachment={att} />);
    expect(container.textContent ?? '').not.toContain('*');
  });

  it('always renders the player line, falling back to ? placeholders when white/black are null (#84)', () => {
    // Pre-#84 the player-line <p> was hidden when both white and black
    // were null. That made the metadata column shorter than the board
    // and visually centered the surviving rows. The line is now always
    // rendered with `?` placeholders so the layout stays identical
    // regardless of how many headers the PGN body actually carried.
    const att = makeAttachment({
      headerWhite: null,
      headerBlack: null,
    });
    const { container, queryByText } = render(<AttachedGameCard attachment={att} />);
    expect(queryByText(/vs/)).not.toBeNull();
    const text = container.textContent ?? '';
    // Two `?` placeholders, one for each side.
    expect(text.match(/\?/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(container.querySelector('[data-testid="mini-board"]')).not.toBeNull();
  });

  it('renders the "Attached game" label so the layout matches AttachedFenCard (#84)', () => {
    const { container } = render(<AttachedGameCard attachment={makeAttachment()} />);
    expect(container.textContent ?? '').toContain('Attached game');
  });

  it('always renders a Date row, falling back to ????.??.?? when headerDate is null (#84)', () => {
    const att = makeAttachment({ headerDate: null });
    const { container } = render(<AttachedGameCard attachment={att} />);
    const text = container.textContent ?? '';
    expect(text).toContain('card.headerDate');
    expect(text).toContain('????.??.??');
  });

  it('always renders a Site row for source=pgn, falling back to ???? when headerSite is null (#84)', () => {
    const att = makeAttachment({ source: 'pgn', headerSite: null });
    const { container } = render(<AttachedGameCard attachment={att} />);
    const text = container.textContent ?? '';
    expect(text).toContain('card.headerSite');
    expect(text).toContain('????');
  });

  it('wraps the thumbnail in a button so tapping it opens the replay modal', () => {
    const { container } = render(<AttachedGameCard attachment={makeAttachment()} />);
    const board = container.querySelector('[data-testid="mini-board"]');
    expect(board).not.toBeNull();
    // The thumbnail must be inside a real <button> with a meaningful
    // aria-label so screen-reader users can discover the replay action.
    const thumbnailButton = board?.closest('button');
    expect(thumbnailButton).not.toBeNull();
    expect(thumbnailButton?.getAttribute('aria-label')).toMatch(/replay/i);
  });

  it('does NOT render the legacy "Open replay" toggle button anymore', () => {
    const { queryByText } = render(<AttachedGameCard attachment={makeAttachment()} />);
    // The pre-modal UI showed an inline replay button; tapping the
    // thumbnail now opens the modal instead. Pin the absence so a
    // future refactor cannot quietly bring back two trigger surfaces.
    expect(queryByText('card.replayButton')).toBeNull();
    expect(queryByText('card.collapseButton')).toBeNull();
  });

  // ─── Phase I: defense-in-depth — hostile attribution_path render ───
  //
  // Both `parseChesscomAttribution` (write-time) and the
  // `chk_attribution_path_format` DB CHECK pin the path to
  // `[A-Za-z0-9/_-]{1,128}` so an unsafe path SHOULD never reach this
  // component. The tests below probe the *last* line of defense: even
  // if a hostile string somehow survived both upstream checks (a
  // future migration that loosened the constraint, a service-role
  // write that bypassed the validator, a hand-edited row), the React
  // text-child / attribute-value escape MUST keep it from becoming
  // executable markup or an attribute-injection vector.
  it('does not produce an unsafe href when attribution_path is set to a hostile string (XSS defense in depth)', () => {
    // Quote-break + script tag inside the path. The chess.com anchor
    // is now routed through the cushion redirect, so the hostile
    // path is encoded into the `?url=...` query parameter. React's
    // attribute serializer + the encodeURIComponent inside
    // buildCushionPageUrl together render the payload inert: no
    // <script> element node, no quote-break, no JS execution.
    const att = makeAttachment({
      source: 'pgn',
      attributionPlatform: 'chesscom',
      attributionPath: '/admin"><script>alert(1)</script>',
    });
    const { container } = render(<AttachedGameCard attachment={att} />);

    // (1) Hostile payload did NOT spawn a real <script> ELEMENT node.
    // This is the load-bearing invariant — the substring may appear
    // inside the href attribute (HTML allows it there), but it must
    // never become a real <script> child.
    expect(container.querySelector('script')).toBeNull();

    // (2) The anchor renders with a single href attribute pointing at
    // the cushion page. The decoded `url` parameter contains the full
    // hostile path verbatim — encoded, then decoded once — so a
    // future renderer change that mangled the path would be caught.
    const anchors = Array.from(container.querySelectorAll('a'));
    const cushioned = anchors.find((a) =>
      (a.getAttribute('href') ?? '').startsWith('/en/redirect?url=')
    );
    expect(cushioned).toBeDefined();
    const decodedUrl = decodeURIComponent(cushioned!.getAttribute('href')!.split('?url=')[1]);
    expect(decodedUrl).toBe('https://www.chess.com/admin"><script>alert(1)</script>');

    // (3) Attribute hardening still applies even on the hostile path.
    const rel = cushioned?.getAttribute('rel') ?? '';
    expect(rel).toContain('noopener');
    expect(rel).toContain('noreferrer');
    expect(rel).toContain('nofollow');
  });

  it('does not produce a javascript: href when attribution_path tries to break out of the chess.com origin', () => {
    // The renderer hard-codes `https://www.chess.com` as the prefix —
    // attempts to override the scheme via the path are inert because
    // the scheme is not user-controlled. Pin this so a future refactor
    // that derives the prefix from a data field cannot regress to a
    // scheme-injection bug. The cushion page additionally validates
    // protocols server-side; here we assert no anchor's href ever
    // surfaces a `javascript:` prefix at the renderer layer.
    const att = makeAttachment({
      source: 'pgn',
      attributionPlatform: 'chesscom',
      attributionPath: '/javascript:alert(1)',
    });
    const { container } = render(<AttachedGameCard attachment={att} />);
    const anchors = Array.from(container.querySelectorAll('a'));
    const evilHref = anchors
      .map((a) => a.getAttribute('href') ?? '')
      .find((h) => h.startsWith('javascript:'));
    expect(evilHref).toBeUndefined();
    // The cushion link is still rendered, with the literal (inert)
    // path embedded inside the encoded url parameter.
    const cushioned = anchors.find(
      (a) =>
        (a.getAttribute('href') ?? '').startsWith('/en/redirect?url=') &&
        decodeURIComponent(a.getAttribute('href')!.split('?url=')[1]).startsWith(
          'https://www.chess.com/javascript:'
        )
    );
    expect(cushioned).toBeDefined();
  });
});

// ─── M2 bundle isolation guard (static source check) ───
//
// The summary card MUST NOT statically import `chess-core` — that would
// pull chess.js into the chunk-page first-paint client bundle. The
// chess.js-bearing replay UI lives in a separate file (GameReplayModal)
// loaded lazily via `next/dynamic({ ssr: false })`. We pin this contract
// with a source-text grep so a future refactor that moves a chess-core
// import into the summary card surfaces here in CI rather than in a
// production bundle-size regression.
describe('AttachedGameCard — module graph contract (M2)', () => {
  it('does not statically import @blindfold-chess/features/chess-core', async () => {
    const { readFile } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const path = await import('node:path');

    const here = path.dirname(fileURLToPath(import.meta.url));
    const source = await readFile(path.join(here, 'AttachedGameCard.tsx'), 'utf8');

    // The replay modal IS allowed to import chess-core; the summary
    // card must not. Grep accepts both quote styles.
    expect(source).not.toMatch(/from\s+['"]@blindfold-chess\/features\/chess-core['"]/);
    expect(source).not.toMatch(/from\s+['"]chess\.js['"]/);
  });

  it('the replay modal IS allowed to import chess-core (sanity check)', async () => {
    const { readFile } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const path = await import('node:path');

    const here = path.dirname(fileURLToPath(import.meta.url));
    const replaySource = await readFile(path.join(here, 'GameReplayModal.tsx'), 'utf8');

    expect(replaySource).toMatch(/from\s+['"]@blindfold-chess\/features\/chess-core['"]/);
  });
});
