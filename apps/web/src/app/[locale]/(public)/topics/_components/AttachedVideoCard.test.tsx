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
 * Tester suite for AttachedVideoCard — pins the SecurityEngineer
 * judgement for issue #75 (sandbox / allow / referrer / loading) and
 * the renderer-rebuilt-src invariant.
 */
describe('AttachedVideoCard — iframe rendering (issue #75)', () => {
  it('renders an iframe for a YouTube attachment', () => {
    const { container } = render(
      <AttachedVideoCard attachment={makeAttachment()} fallbackTitle={FALLBACK_TITLE} />
    );
    expect(container.querySelector('iframe')).not.toBeNull();
  });

  it('iframe sandbox is exactly "allow-scripts allow-same-origin" (string-equality)', () => {
    const { container } = render(
      <AttachedVideoCard attachment={makeAttachment()} fallbackTitle={FALLBACK_TITLE} />
    );
    const iframe = container.querySelector('iframe');
    // SE judgement for #75 pinned this exact literal. Anything broader
    // (allow-popups / allow-top-navigation / allow-popups-to-escape-sandbox)
    // is a regression — pin via strict equality so a future widening is
    // a deliberate test edit.
    expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin');
  });

  it('iframe sandbox does NOT include allow-top-navigation, allow-popups, or allow-popups-to-escape-sandbox', () => {
    const { container } = render(
      <AttachedVideoCard attachment={makeAttachment()} fallbackTitle={FALLBACK_TITLE} />
    );
    const sandbox = container.querySelector('iframe')?.getAttribute('sandbox') ?? '';
    expect(sandbox).not.toContain('allow-top-navigation');
    expect(sandbox).not.toContain('allow-popups');
    expect(sandbox).not.toContain('allow-popups-to-escape-sandbox');
  });

  it('iframe allow attribute grants only fullscreen / pip / encrypted-media / motion sensors', () => {
    const { container } = render(
      <AttachedVideoCard attachment={makeAttachment()} fallbackTitle={FALLBACK_TITLE} />
    );
    const allow = container.querySelector('iframe')?.getAttribute('allow') ?? '';
    expect(allow).toBe('fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope');
    // Negative pins — none of the dangerous Permissions Policy
    // features may be delegated.
    expect(allow).not.toContain('camera');
    expect(allow).not.toContain('microphone');
    expect(allow).not.toContain('geolocation');
    expect(allow).not.toContain('payment');
  });

  it('iframe has referrerpolicy="no-referrer", loading="lazy", and allowfullscreen', () => {
    const { container } = render(
      <AttachedVideoCard attachment={makeAttachment()} fallbackTitle={FALLBACK_TITLE} />
    );
    const iframe = container.querySelector('iframe');
    expect(iframe?.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(iframe?.getAttribute('loading')).toBe('lazy');
    // React serializes `allowFullScreen` to the lowercased DOM
    // attribute `allowfullscreen` (boolean attribute, value is empty).
    expect(iframe?.hasAttribute('allowfullscreen')).toBe(true);
  });

  it('iframe src is rebuilt from (provider, providerVideoId) on the youtube-nocookie.com host', () => {
    const { container } = render(
      <AttachedVideoCard attachment={makeAttachment()} fallbackTitle={FALLBACK_TITLE} />
    );
    const src = container.querySelector('iframe')?.getAttribute('src') ?? '';
    expect(src).toBe(`https://www.youtube-nocookie.com/embed/${VALID_ID}`);
    // Negative pins: the standard youtube.com host is intentionally
    // never used by the renderer.
    expect(src).not.toContain('https://www.youtube.com/');
    expect(src).not.toContain('https://youtube.com/');
  });

  it('iframe src does NOT come from a persisted source URL', () => {
    // The data type does not carry sourceUrl — that column is
    // audit-only and intentionally absent from `AttachedVideoCardData`.
    // Even when a hostile-shaped value is fed via providerVideoId, the
    // src remains anchored to youtube-nocookie.com because the host
    // prefix is hard-coded.
    const att = makeAttachment({ providerVideoId: 'abcdefghijk' });
    const { container } = render(
      <AttachedVideoCard attachment={att} fallbackTitle={FALLBACK_TITLE} />
    );
    const src = container.querySelector('iframe')?.getAttribute('src') ?? '';
    expect(src.startsWith('https://www.youtube-nocookie.com/embed/')).toBe(true);
  });

  it('thumbnail URL template uses img.youtube.com/vi/{id}/hqdefault.jpg (issue #75 thumbnail spec)', () => {
    const { container } = render(
      <AttachedVideoCard attachment={makeAttachment()} fallbackTitle={FALLBACK_TITLE} />
    );
    const iframe = container.querySelector('iframe');
    // The renderer derives the thumbnail URL server-side from
    // providerVideoId (oEmbed deferred — see issue #75 M-6). It is
    // exposed as a data attribute for audit visibility.
    expect(iframe?.getAttribute('data-thumbnail')).toBe(
      `https://img.youtube.com/vi/${VALID_ID}/hqdefault.jpg`
    );
  });

  it('title falls back to the parent-provided localized string when attachment.title is null', () => {
    const { container } = render(
      <AttachedVideoCard
        attachment={makeAttachment({ title: null })}
        fallbackTitle={FALLBACK_TITLE}
      />
    );
    expect(container.querySelector('iframe')?.getAttribute('title')).toBe(FALLBACK_TITLE);
  });

  it('title uses the persisted attachment.title when present', () => {
    const att = makeAttachment({ title: 'My favorite opening trap' });
    const { container } = render(
      <AttachedVideoCard attachment={att} fallbackTitle={FALLBACK_TITLE} />
    );
    expect(container.querySelector('iframe')?.getAttribute('title')).toBe(
      'My favorite opening trap'
    );
  });

  it('renders nothing for an unknown provider (defense in depth)', () => {
    const att: AttachedVideoCardData = {
      id: 'unknown-1',
      provider: 'vimeo',
      providerVideoId: 'abc',
      title: null,
    };
    const { container } = render(
      <AttachedVideoCard attachment={att} fallbackTitle={FALLBACK_TITLE} />
    );
    expect(container.querySelector('iframe')).toBeNull();
  });
});
