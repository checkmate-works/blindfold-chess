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
    embedProvider: 'chesscom',
    embedId: '12345',
    attributionPlatform: null,
    attributionPath: null,
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
 *
 * Phase 13 (#83) narrowed `post_game_embed_attachments.embed_provider`
 * to `'chesscom'` only; the corresponding Lichess-iframe assertions
 * are removed. Lichess /embed/{id} URLs are now rendered by
 * AttachedGameCard (the self-hosted PGN replay UI) — coverage for
 * that path lives in createChunkPostWithAttachment.test.ts and the
 * existing AttachedGameCard suite.
 */
describe('AttachedEmbedCard — iframe rendering (Phase B Tester #30〜#34, #47)', () => {
  // #30 — chess.com sandbox literal
  it('#30 chess.com renders an iframe with sandbox="allow-scripts allow-same-origin" exactly (string-equality)', () => {
    const att = makeAttachment();
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

  // #30b — regression-prevention: allow-same-origin is present (Phase 9
  //          fix). Token-membership check complements the strict-equality
  //          test above by making the intent of *this specific token*
  //          explicit.
  it('#30b chess.com sandbox includes allow-same-origin (Phase 9 fix-pass #9)', () => {
    const att = makeAttachment();
    const { container } = render(<AttachedEmbedCard attachment={att} />);
    const iframe = container.querySelector('iframe');
    const tokens = (iframe?.getAttribute('sandbox') ?? '').split(/\s+/).filter(Boolean);
    expect(tokens).toContain('allow-scripts');
    expect(tokens).toContain('allow-same-origin');
  });

  // #30c — regression-prevention: tokens that were never on the
  //          allowlist must NOT silently appear. allow-top-navigation
  //          / allow-presentation / allow-forms / allow-modals etc.
  //          would meaningfully widen the sandbox; pin their absence.
  it('#30c chess.com sandbox does NOT include unrelated dangerous tokens', () => {
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
    // chess.com is a static diagram — popup tokens are not allowed here.
    expect(tokens).not.toContain('allow-popups');
    expect(tokens).not.toContain('allow-popups-to-escape-sandbox');
  });

  // #32 — referrerpolicy + loading
  it('#32 chess.com iframe renders with referrerpolicy="no-referrer" and loading="lazy"', () => {
    const att = makeAttachment({ embedId: '99999' });
    const { container } = render(<AttachedEmbedCard attachment={att} />);
    const iframe = container.querySelector('iframe');
    // React serializes the camelCase prop `referrerPolicy` to the DOM
    // attribute `referrerpolicy` (lowercase). Read via getAttribute so
    // we are pinning the wire-format that the browser actually sees.
    expect(iframe?.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(iframe?.getAttribute('loading')).toBe('lazy');
  });

  // #33 — src is reconstructed from (provider, embedId), NOT from a
  //       persisted source_url field
  it('#33 chess.com iframe src is rebuilt from (provider, embedId), NOT a persisted hostile URL', () => {
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
    // the URL template literal `https://www.chess.com/emboard?id=${embedId}`.
    //
    // We document the actual behavior here:
    //   - The renderer does NOT throw.
    //   - The hostile chars land verbatim inside the `src` attribute
    //     (HTML serialization escapes `"` and `&` so the attribute does
    //     not break out, but the URL itself is malformed — the browser
    //     will fail to load it cross-origin under CSP `frame-src`).
    //   - The provider domain prefix is hard-coded, so the iframe still
    //     points at chess.com's origin (no scheme injection possible).
    //
    // The DB CHECK + per-provider parser regex remain the actual defense.
    // This test exists so a future renderer change that DOES introduce
    // sanitization is a deliberate edit with this assertion updated.
    const att: AttachedEmbedCardData = {
      id: 'embed-att-unsafe',
      embedProvider: 'chesscom',
      embedId: `abc'"<>`,
      attributionPlatform: null,
      attributionPath: null,
    };
    const { container } = render(<AttachedEmbedCard attachment={att} />);
    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    const src = iframe?.getAttribute('src') ?? '';

    // The src starts with the canonical chess.com emboard origin.
    expect(src.startsWith('https://www.chess.com/emboard?id=')).toBe(true);
    // No <script> element node was created in the DOM as a side effect
    // of the hostile interpolation — React's attribute escape kept the
    // payload inside the attribute value.
    expect(container.querySelector('script')).toBeNull();
  });

  // #47 — title is a static per-provider string, NOT user-controlled
  it('#47 chess.com iframe title is the static literal "Chess.com diagram embed"', () => {
    const att = makeAttachment();
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

  it('#47 user-controlled fields cannot affect the iframe title', () => {
    // Pump hostile-looking values into every user-controlled column —
    // the title must remain the static per-provider literal. This
    // protects against a future refactor that accidentally derives the
    // title from `embedId` or attribution columns.
    const att: AttachedEmbedCardData = {
      id: 'cc-hostile',
      embedProvider: 'chesscom',
      embedId: 'evilevil',
      attributionPlatform: null,
      attributionPath: null,
    };
    const { container } = render(<AttachedEmbedCard attachment={att} />);
    const iframe = container.querySelector('iframe');
    const title = iframe?.getAttribute('title') ?? '';
    // Title is provider-static — user input did not bleed in.
    expect(title).toBe('Chess.com diagram embed');
    expect(title).not.toContain('evilevil');
  });

  // ─── Phase 13 (#83) regression: lichess provider renders nothing ───
  // Even though the DB CHECK now rejects 'lichess' inserts, a drifted
  // legacy row carrying `embed_provider='lichess'` must render as
  // null (no iframe, no broken UI) rather than producing a broken
  // chess.com iframe URL or throwing.
  it('renders nothing for embed_provider="lichess" (Phase 13 regression — DB CHECK now rejects this)', () => {
    const att: AttachedEmbedCardData = {
      id: 'lichess-legacy',
      embedProvider: 'lichess',
      embedId: 'abcd1234',
      attributionPlatform: 'lichess',
      attributionPath: '/abcd1234',
    };
    const { container } = render(<AttachedEmbedCard attachment={att} />);
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.firstChild).toBeNull();
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
    // Renders nothing — the DB CHECK constrains provider to 'chesscom'
    // only (Phase 13), so this branch is unreachable in practice. Pin
    // the safe-fallback behavior anyway.
    expect(container.querySelector('iframe')).toBeNull();
  });
});
