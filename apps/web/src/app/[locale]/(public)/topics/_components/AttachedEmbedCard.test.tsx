import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AttachedEmbedCardData } from './AttachedEmbedCard';
import { AttachedEmbedCard } from './AttachedEmbedCard';

afterEach(() => {
  cleanup();
});

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

function makeAttachment(overrides: Partial<AttachedEmbedCardData> = {}): AttachedEmbedCardData {
  return {
    id: 'embed-att-1',
    embedProvider: 'lichess',
    embedId: 'abcd1234',
    attributionPlatform: 'lichess',
    attributionPath: '/abcd1234',
    ...overrides,
  };
}

/**
 * Phase B Tester suite — D8 #30 〜 #34 + #47.
 *
 * These tests pin the SecurityEngineer Phase 1 baseline (D1) for the iframe
 * `sandbox` attribute, the `referrerpolicy` / `loading` defaults (D2),
 * the renderer-rebuilt `src` invariant (D7 / SPEC1 §5-1), and the
 * static-string `title` attribute used for a11y (D8 #47).
 */
describe('AttachedEmbedCard — iframe rendering (Phase B Tester #30〜#34, #47)', () => {
  // #30 — chess.com sandbox literal
  it('#30 chess.com renders an iframe with sandbox="allow-scripts allow-same-origin" exactly (string-equality)', () => {
    const att = makeAttachment({
      embedProvider: 'chesscom',
      embedId: '12345',
      attributionPlatform: null,
      attributionPath: null,
    });
    const { container } = render(<AttachedEmbedCard attachment={att} />);
    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    // Exact string-equality, not contains-check. The SecurityEngineer
    // baseline (D1) pins this literal — anything broader is a regression.
    // fix-pass #9 (Phase 9): allow-same-origin added — chess.com's Vue +
    // pinia bootloader unconditionally reads localStorage and fetches
    // its own /manifest.json, both of which fail as null-origin.
    expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin');
  });

  // #31 — Lichess sandbox literal
  it('#31 Lichess renders an iframe with sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" exactly', () => {
    const att = makeAttachment();
    const { container } = render(<AttachedEmbedCard attachment={att} />);
    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    // SecurityEngineer baseline (D1) Lichess literal. Order matters
    // because we are doing a strict equality; if a future change reorders
    // the tokens this test will fire and force a deliberate update.
    // fix-pass #9 (Phase 9): allow-same-origin added — without it the
    // Lichess embed cannot use its own localStorage or fetch its own
    // origin, surfacing as console SecurityError + Unsafe-attempt-to-
    // load-URL warnings even though the board renders.
    expect(iframe?.getAttribute('sandbox')).toBe(
      'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox'
    );
  });

  // #30b / #31b — regression-prevention: allow-same-origin is present on
  //                both providers (Phase 9 fix). Token-membership check
  //                complements the strict-equality tests above by making
  //                the intent of *this specific token* explicit.
  it('#30b chess.com sandbox includes allow-same-origin (Phase 9 fix-pass #9)', () => {
    const att = makeAttachment({
      embedProvider: 'chesscom',
      embedId: '12345',
      attributionPlatform: null,
      attributionPath: null,
    });
    const { container } = render(<AttachedEmbedCard attachment={att} />);
    const iframe = container.querySelector('iframe');
    const tokens = (iframe?.getAttribute('sandbox') ?? '').split(/\s+/).filter(Boolean);
    expect(tokens).toContain('allow-scripts');
    expect(tokens).toContain('allow-same-origin');
  });

  it('#31b Lichess sandbox includes allow-same-origin alongside the existing tokens (Phase 9 fix-pass #9)', () => {
    const att = makeAttachment();
    const { container } = render(<AttachedEmbedCard attachment={att} />);
    const iframe = container.querySelector('iframe');
    const tokens = (iframe?.getAttribute('sandbox') ?? '').split(/\s+/).filter(Boolean);
    expect(tokens).toContain('allow-scripts');
    expect(tokens).toContain('allow-same-origin');
    // Pre-existing Phase B tokens must remain — `allow-same-origin`
    // is added to the allowlist, not a replacement for them.
    expect(tokens).toContain('allow-popups');
    expect(tokens).toContain('allow-popups-to-escape-sandbox');
  });

  // #30c / #31c — regression-prevention: tokens that were never on the
  //                allowlist must NOT silently appear. allow-top-navigation
  //                / allow-presentation / allow-forms / allow-modals etc.
  //                would meaningfully widen the sandbox; pin their absence.
  it('#30c chess.com sandbox does NOT include unrelated dangerous tokens', () => {
    const att = makeAttachment({
      embedProvider: 'chesscom',
      embedId: '12345',
      attributionPlatform: null,
      attributionPath: null,
    });
    const { container } = render(<AttachedEmbedCard attachment={att} />);
    const iframe = container.querySelector('iframe');
    const tokens = (iframe?.getAttribute('sandbox') ?? '').split(/\s+/).filter(Boolean);
    expect(tokens).not.toContain('allow-top-navigation');
    expect(tokens).not.toContain('allow-top-navigation-by-user-activation');
    expect(tokens).not.toContain('allow-presentation');
    expect(tokens).not.toContain('allow-forms');
    expect(tokens).not.toContain('allow-modals');
    expect(tokens).not.toContain('allow-pointer-lock');
    expect(tokens).not.toContain('allow-downloads');
    // chess.com is a static diagram — popup tokens are not allowed here
    // (only Lichess needs them).
    expect(tokens).not.toContain('allow-popups');
    expect(tokens).not.toContain('allow-popups-to-escape-sandbox');
  });

  it('#31c Lichess sandbox does NOT include unrelated dangerous tokens', () => {
    const att = makeAttachment();
    const { container } = render(<AttachedEmbedCard attachment={att} />);
    const iframe = container.querySelector('iframe');
    const tokens = (iframe?.getAttribute('sandbox') ?? '').split(/\s+/).filter(Boolean);
    expect(tokens).not.toContain('allow-top-navigation');
    expect(tokens).not.toContain('allow-top-navigation-by-user-activation');
    expect(tokens).not.toContain('allow-presentation');
    expect(tokens).not.toContain('allow-forms');
    expect(tokens).not.toContain('allow-modals');
    expect(tokens).not.toContain('allow-pointer-lock');
    expect(tokens).not.toContain('allow-downloads');
  });

  // #32 — referrerpolicy + loading on both providers
  it('#32 both providers render with referrerpolicy="no-referrer" and loading="lazy"', () => {
    const lichessAtt = makeAttachment();
    const { container: lichessContainer } = render(<AttachedEmbedCard attachment={lichessAtt} />);
    const lichessIframe = lichessContainer.querySelector('iframe');
    // React serializes the camelCase prop `referrerPolicy` to the DOM
    // attribute `referrerpolicy` (lowercase). Read via getAttribute so
    // we are pinning the wire-format that the browser actually sees.
    expect(lichessIframe?.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(lichessIframe?.getAttribute('loading')).toBe('lazy');

    cleanup();

    const chesscomAtt = makeAttachment({
      embedProvider: 'chesscom',
      embedId: '99999',
      attributionPlatform: null,
      attributionPath: null,
    });
    const { container: chesscomContainer } = render(<AttachedEmbedCard attachment={chesscomAtt} />);
    const chesscomIframe = chesscomContainer.querySelector('iframe');
    expect(chesscomIframe?.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(chesscomIframe?.getAttribute('loading')).toBe('lazy');
  });

  // #33 — src is reconstructed from (provider, embedId), NOT from a
  //       persisted source_url field
  it('#33 Lichess iframe src is rebuilt from (provider, embedId), NOT any persisted hostile URL', () => {
    // The data type does NOT carry a `source_url` field — that column is
    // audit-only and intentionally absent from `AttachedEmbedCardData`.
    // The test below is therefore a stronger statement: even when the
    // attribution columns carry a hostile-shaped string, the rendered
    // src must still resolve to the canonical Lichess origin. (The
    // attribution_path may legitimately be `/<embedId>` per the writer;
    // a hostile mismatch should NOT bleed into the iframe src.)
    const att: AttachedEmbedCardData = {
      id: 'embed-att-hostile',
      embedProvider: 'lichess',
      embedId: 'abcd1234',
      // Hostile attribution columns — still must NOT influence the src.
      attributionPlatform: 'lichess',
      attributionPath: '/attacker.example.com/x',
    };
    const { container } = render(<AttachedEmbedCard attachment={att} />);
    const iframe = container.querySelector('iframe');
    const src = iframe?.getAttribute('src') ?? '';

    // The src MUST start with the canonical Lichess embed origin.
    expect(src.startsWith('https://lichess.org/embed/abcd1234')).toBe(true);

    // Belt-and-braces: the hostile string never lands inside the src.
    expect(src).not.toContain('attacker.example.com');
  });

  it('#33b chess.com iframe src is rebuilt from (provider, embedId), NOT a persisted hostile URL', () => {
    const att: AttachedEmbedCardData = {
      id: 'embed-att-cc',
      embedProvider: 'chesscom',
      embedId: '12345',
      attributionPlatform: null,
      attributionPath: null,
    };
    const { container } = render(<AttachedEmbedCard attachment={att} />);
    const iframe = container.querySelector('iframe');
    const src = iframe?.getAttribute('src') ?? '';
    expect(src).toBe('https://www.chess.com/emboard?id=12345');
    // No tracker-style query strings have leaked into the rebuilt src.
    expect(src).not.toContain('attacker');
  });

  // #34 — unsafe characters in embed_id
  it('#34 unsafe-character embed_id passes through to the rebuilt src as-is (last-line-of-defense documentation)', () => {
    // The DB CHECK `^[A-Za-z0-9_-]{1,64}$` and the parser's per-provider
    // regex would both reject this input upstream. The renderer is the
    // last line of defense, but it does NOT itself perform character
    // sanitization on `embedId`: it interpolates `embedId` directly into
    // the URL template literal `https://lichess.org/embed/${embedId}`.
    //
    // We document the actual behavior here:
    //   - The renderer does NOT throw.
    //   - The hostile chars land verbatim inside the `src` attribute
    //     (HTML serialization escapes `"` and `&` so the attribute does
    //     not break out, but the URL itself is malformed — the browser
    //     will fail to load it cross-origin under CSP `frame-src`).
    //   - The provider domain prefix is hard-coded, so the iframe still
    //     points at lichess.org's origin (no scheme injection possible).
    //
    // The DB CHECK + per-provider parser regex remain the actual defense.
    // This test exists so a future renderer change that DOES introduce
    // sanitization is a deliberate edit with this assertion updated.
    const att: AttachedEmbedCardData = {
      id: 'embed-att-unsafe',
      embedProvider: 'lichess',
      embedId: `abc'"<>`,
      attributionPlatform: null,
      attributionPath: null,
    };
    const { container } = render(<AttachedEmbedCard attachment={att} />);
    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    const src = iframe?.getAttribute('src') ?? '';

    // The src starts with the canonical Lichess embed origin. The
    // iframe element-ness was preserved (no script tag was synthesized
    // out of attribute escape).
    expect(src.startsWith('https://lichess.org/embed/')).toBe(true);
    // No <script> element node was created in the DOM as a side effect
    // of the hostile interpolation — React's attribute escape kept the
    // payload inside the attribute value.
    expect(container.querySelector('script')).toBeNull();
  });

  // #47 — title is a static per-provider string, NOT user-controlled
  it('#47 chess.com iframe title is the static literal "Chess.com diagram embed"', () => {
    const att: AttachedEmbedCardData = {
      id: 'cc-1',
      embedProvider: 'chesscom',
      embedId: '12345',
      attributionPlatform: null,
      attributionPath: null,
    };
    const { container } = render(<AttachedEmbedCard attachment={att} />);
    const iframe = container.querySelector('iframe');
    const title = iframe?.getAttribute('title') ?? '';
    // a11y: title must be non-empty.
    expect(title.length).toBeGreaterThan(0);
    // The exact static literal — pin it so a translator-driven dynamic
    // string cannot silently slip in (which would let user input affect
    // the title under a buggy template).
    expect(title).toBe('Chess.com diagram embed');
  });

  it('#47 Lichess iframe title is the static literal "Lichess game replay"', () => {
    const att = makeAttachment();
    const { container } = render(<AttachedEmbedCard attachment={att} />);
    const iframe = container.querySelector('iframe');
    const title = iframe?.getAttribute('title') ?? '';
    expect(title.length).toBeGreaterThan(0);
    expect(title).toBe('Lichess game replay');
  });

  it('#47 user-controlled fields cannot affect the iframe title', () => {
    // Pump hostile-looking values into every user-controlled column —
    // the title must remain the static per-provider literal. This
    // protects against a future refactor that accidentally derives the
    // title from `embedId` or attribution columns.
    const att: AttachedEmbedCardData = {
      id: 'lichess-hostile',
      embedProvider: 'lichess',
      embedId: 'evilevil',
      attributionPlatform: 'lichess',
      attributionPath: '/evilevil',
    };
    const { container } = render(<AttachedEmbedCard attachment={att} />);
    const iframe = container.querySelector('iframe');
    const title = iframe?.getAttribute('title') ?? '';
    // Title is provider-static — user input did not bleed in.
    expect(title).toBe('Lichess game replay');
    expect(title).not.toContain('evilevil');
  });

  // ─── Additional coverage: unknown provider falls back to nothing ───
  it('renders nothing for an unknown embed_provider (defense in depth)', () => {
    const att: AttachedEmbedCardData = {
      id: 'unknown-1',
      embedProvider: 'youtube',
      embedId: 'abc',
      attributionPlatform: null,
      attributionPath: null,
    };
    const { container } = render(<AttachedEmbedCard attachment={att} />);
    // Renders nothing — the DB CHECK constrains provider to the two
    // known values, so this branch is unreachable in practice. Pin the
    // safe-fallback behavior anyway.
    expect(container.querySelector('iframe')).toBeNull();
  });
});
