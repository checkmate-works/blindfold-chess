import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { AttachedVideoCardData } from './AttachedVideoCard';
import { AttachedVideoCard } from './AttachedVideoCard';

afterEach(() => {
  cleanup();
});

const VALID_ID = 'VALIDID0001';
const FALLBACK_TITLE = 'YouTube video';

function makeAttachment(overrides: Partial<AttachedVideoCardData> = {}): AttachedVideoCardData {
  return {
    id: 'video-att-1',
    provider: 'youtube',
    providerVideoId: VALID_ID,
    title: null,
    ...overrides,
  };
}

/**
 * Boundary pins for `AttachedVideoCard` rendering.
 *
 * The Coder suite covers sandbox / allow / referrer / loading / fallback
 * title and the canonical embed-src reconstruction.
 *
 * This file pins:
 *   - The iframe `src` literal prefix (string-equality on the host) so a
 *     refactor that templates the host from a config / env variable will
 *     fail loudly if a wrong host is plumbed in.
 *   - The renderer's behavior when the row carries a malicious
 *     `providerVideoId` (e.g. one that violates the DB CHECK because it
 *     leaked through). The current contract is that the row is rendered
 *     verbatim — the audit trail is the DB CHECK + URL parser. The
 *     renderer does NOT re-validate. We pin both that this is the
 *     current behavior AND that the embed origin remains
 *     `youtube-nocookie.com`.
 *   - That the renderer NEVER uses the standard `youtube.com` / `youtu.be`
 *     hosts, regardless of what `providerVideoId` looks like.
 *   - That the unknown-provider path returns null cleanly for all
 *     non-`youtube` discriminator values (vimeo / twitch / empty / weird).
 *   - That an empty `providerVideoId` still renders without crashing
 *     (defense in depth — this should be unreachable behind the DB
 *     CHECK + URL parser).
 */

describe('AttachedVideoCard — embed src host pin (string equality)', () => {
  it('iframe src starts with exactly "https://www.youtube-nocookie.com/embed/"', () => {
    const { container } = render(
      <AttachedVideoCard attachment={makeAttachment()} fallbackTitle={FALLBACK_TITLE} />
    );
    const src = container.querySelector('iframe')?.getAttribute('src') ?? '';
    expect(src).toBe(`https://www.youtube-nocookie.com/embed/${VALID_ID}`);
    expect(src.startsWith('https://www.youtube-nocookie.com/embed/')).toBe(true);
  });

  it('iframe src never references the standard youtube.com host', () => {
    const { container } = render(
      <AttachedVideoCard attachment={makeAttachment()} fallbackTitle={FALLBACK_TITLE} />
    );
    const src = container.querySelector('iframe')?.getAttribute('src') ?? '';
    // String anchor pin — neither the cookied host nor the apex form
    // may appear anywhere in the rendered src.
    expect(src.includes('//www.youtube.com')).toBe(false);
    expect(src.includes('//youtube.com')).toBe(false);
    expect(src.includes('//youtu.be')).toBe(false);
  });

  it('iframe src does NOT echo back the persisted source URL (data type omits it)', () => {
    // Even attempting to plumb a sourceUrl through the props is a TS
    // error: `AttachedVideoCardData` only carries id / provider /
    // providerVideoId / title. Pin the renderer's contract by
    // constructing an attachment and verifying the rendered src is
    // derived solely from providerVideoId.
    const att = makeAttachment({ providerVideoId: VALID_ID });
    const { container } = render(
      <AttachedVideoCard attachment={att} fallbackTitle={FALLBACK_TITLE} />
    );
    const src = container.querySelector('iframe')?.getAttribute('src') ?? '';
    // Reconstructed src must not contain any URL-shaped substring
    // other than the canonical youtube-nocookie embed prefix +
    // providerVideoId. Belt-and-braces: there must be exactly one
    // `https://` substring (the host prefix), no smuggled second URL.
    const httpsCount = src.split('https://').length - 1;
    expect(httpsCount).toBe(1);
  });
});

describe('AttachedVideoCard — malicious providerVideoId (defense-in-depth render contract)', () => {
  // The DB CHECK + URL parser collapse all hostile-shaped video ids
  // before they can reach the renderer. If a future migration drops
  // either layer, the renderer's behavior becomes the last line of
  // defense. The current contract is "render verbatim, anchored to the
  // youtube-nocookie host". Pin that the renderer does NOT crash and
  // does NOT silently switch hosts when fed a malicious id.

  const HOSTILE_IDS: ReadonlyArray<readonly [string, string]> = [
    ['SQLi-shaped', "'; DROP TABLE post_video_attachments; --"],
    ['HTML-injection-shaped', '<script>alert(1)</script>'],
    ['scheme-injection-shaped', 'javascript:alert(1)'],
    ['protocol-relative path', '//evil.tld/x'],
    ['absolute URL shaped', 'https://evil.tld/x'],
    ['quote-escape shaped', '"><img src=x>'],
    ['empty', ''],
    ['only spaces', '           '],
    ['trailing slash', 'AAAAAAAAAA/'],
  ];

  for (const [label, badId] of HOSTILE_IDS) {
    it(`renders without crashing and remains anchored to youtube-nocookie for ${label} id`, () => {
      const att = makeAttachment({ providerVideoId: badId });
      const { container } = render(
        <AttachedVideoCard attachment={att} fallbackTitle={FALLBACK_TITLE} />
      );
      const iframe = container.querySelector('iframe');
      // The renderer MUST produce an iframe (provider is still
      // 'youtube'). Crashing or returning null here would be a
      // regression — the DB CHECK already gates the input, so the
      // renderer is allowed to trust the row shape.
      expect(iframe).not.toBeNull();
      const src = iframe?.getAttribute('src') ?? '';
      // The host MUST stay youtube-nocookie regardless of what
      // appears in providerVideoId. React's attribute serializer
      // will percent-encode dangerous characters in the URL string,
      // but it will NOT change the host portion.
      expect(src.startsWith('https://www.youtube-nocookie.com/embed/')).toBe(true);
      // And the cookied host must NOT appear anywhere.
      expect(src.includes('//www.youtube.com')).toBe(false);
    });
  }
});

describe('AttachedVideoCard — unknown provider returns null (every non-youtube value)', () => {
  // The DB CHECK constrains provider to `'youtube'`, but the renderer
  // still has an unknown-provider safe-fallback branch. Pin that every
  // non-youtube value collapses to null — including the empty string,
  // a discriminator that resembles a known provider with extra chars,
  // and a discriminator with surrounding whitespace.
  const UNKNOWN_PROVIDERS = [
    'vimeo',
    'twitch',
    'youtub', // missing trailing 'e'
    'YOUTUBE', // case mismatch — equality is byte-exact
    ' youtube',
    'youtube ',
    '',
    'yt',
  ];

  for (const provider of UNKNOWN_PROVIDERS) {
    it(`returns null for provider="${provider}"`, () => {
      const att: AttachedVideoCardData = {
        id: 'unk',
        provider,
        providerVideoId: VALID_ID,
        title: null,
      };
      const { container } = render(
        <AttachedVideoCard attachment={att} fallbackTitle={FALLBACK_TITLE} />
      );
      expect(container.querySelector('iframe')).toBeNull();
    });
  }
});

describe('AttachedVideoCard — sandbox / allow attribute literal pins (regression guard)', () => {
  // The Coder suite already pins these via string equality. We add a
  // second-axis pin: byte-count and token order. If a refactor reorders
  // tokens (semantically equivalent to a browser, but reviewer signal
  // for an intentional change), the test should fail loudly so the
  // diff is reviewed.

  it('sandbox attribute is byte-equal to "allow-scripts allow-same-origin"', () => {
    const { container } = render(
      <AttachedVideoCard attachment={makeAttachment()} fallbackTitle={FALLBACK_TITLE} />
    );
    const sandbox = container.querySelector('iframe')?.getAttribute('sandbox') ?? '';
    expect(sandbox).toBe('allow-scripts allow-same-origin');
    expect(sandbox.length).toBe('allow-scripts allow-same-origin'.length);
  });

  it('allow attribute tokens are in the exact pinned order', () => {
    const { container } = render(
      <AttachedVideoCard attachment={makeAttachment()} fallbackTitle={FALLBACK_TITLE} />
    );
    const allow = container.querySelector('iframe')?.getAttribute('allow') ?? '';
    const tokens = allow.split(';').map((t) => t.trim());
    expect(tokens).toEqual([
      'fullscreen',
      'picture-in-picture',
      'encrypted-media',
      'accelerometer',
      'gyroscope',
    ]);
  });

  it('sandbox attribute does NOT include allow-presentation (SE judgement: deliberately dropped)', () => {
    const { container } = render(
      <AttachedVideoCard attachment={makeAttachment()} fallbackTitle={FALLBACK_TITLE} />
    );
    const sandbox = container.querySelector('iframe')?.getAttribute('sandbox') ?? '';
    expect(sandbox).not.toContain('allow-presentation');
    expect(sandbox).not.toContain('allow-forms');
    expect(sandbox).not.toContain('allow-modals');
    expect(sandbox).not.toContain('allow-downloads');
  });
});

describe('AttachedVideoCard — referrer / loading / data-thumbnail pins', () => {
  it('referrerPolicy is "no-referrer" (privacy: do not leak parent URL to YouTube)', () => {
    const { container } = render(
      <AttachedVideoCard attachment={makeAttachment()} fallbackTitle={FALLBACK_TITLE} />
    );
    expect(container.querySelector('iframe')?.getAttribute('referrerpolicy')).toBe('no-referrer');
  });

  it('loading is "lazy" (do not block first paint with off-viewport embeds)', () => {
    const { container } = render(
      <AttachedVideoCard attachment={makeAttachment()} fallbackTitle={FALLBACK_TITLE} />
    );
    expect(container.querySelector('iframe')?.getAttribute('loading')).toBe('lazy');
  });

  it('data-thumbnail follows the canonical img.youtube.com template', () => {
    const { container } = render(
      <AttachedVideoCard attachment={makeAttachment()} fallbackTitle={FALLBACK_TITLE} />
    );
    expect(container.querySelector('iframe')?.getAttribute('data-thumbnail')).toBe(
      `https://img.youtube.com/vi/${VALID_ID}/hqdefault.jpg`
    );
  });
});
