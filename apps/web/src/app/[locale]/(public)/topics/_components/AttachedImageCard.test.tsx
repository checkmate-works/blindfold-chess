import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AttachedImageCard } from './AttachedImageCard';
import type { AttachedImageCardData } from './AttachedImageCard';

afterEach(() => {
  cleanup();
});

const fixture = (overrides: Partial<AttachedImageCardData> = {}): AttachedImageCardData => ({
  id: 'image-id-1',
  publicUrl: 'https://example.test/storage/v1/object/public/post-images/u/p/r.jpg',
  width: 800,
  height: 600,
  altText: null,
  displayOrder: 0,
  ...overrides,
});

describe('AttachedImageCard', () => {
  it('renders nothing when there are no attachments', () => {
    const { container } = render(<AttachedImageCard attachments={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders one <img> per attachment with the public URL and dimensions', () => {
    const items = [
      fixture({ id: 'a', publicUrl: 'https://example.test/a.jpg', altText: 'first' }),
      fixture({ id: 'b', publicUrl: 'https://example.test/b.png', width: 100, height: 200 }),
    ];
    const { container } = render(<AttachedImageCard attachments={items} />);
    const imgs = container.querySelectorAll('img');
    expect(imgs.length).toBe(2);
    expect(imgs[0].getAttribute('src')).toBe('https://example.test/a.jpg');
    expect(imgs[0].getAttribute('alt')).toBe('first');
    expect(imgs[1].getAttribute('src')).toBe('https://example.test/b.png');
    expect(imgs[1].getAttribute('width')).toBe('100');
    expect(imgs[1].getAttribute('height')).toBe('200');
  });

  it('renders an empty alt attribute when altText is null', () => {
    const { container } = render(<AttachedImageCard attachments={[fixture({ altText: null })]} />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('alt')).toBe('');
  });

  it('lazy-loads images and pins referrerPolicy to no-referrer', () => {
    const { container } = render(<AttachedImageCard attachments={[fixture()]} />);
    const img = container.querySelector('img');
    expect(img?.getAttribute('loading')).toBe('lazy');
    expect(img?.getAttribute('referrerpolicy')).toBe('no-referrer');
  });

  // ─── Uniform thumbnail layout pins ─────────────────────────────────────

  it('lays thumbnails out in a flex-wrap row (not a per-cardinality grid)', () => {
    // All cardinalities share one layout: a flex-wrap row of fixed-size
    // thumbnails. Pin `flex`/`flex-wrap` so a refactor can't reintroduce
    // the old cardinality-branched grid.
    const r1 = render(<AttachedImageCard attachments={[fixture()]} />);
    expect(r1.container.querySelector('ul')?.className).toMatch(/flex-wrap/);
    expect(r1.container.querySelector('ul')?.className).not.toMatch(/grid-cols/);
    cleanup();
    const items3 = [fixture({ id: 'a' }), fixture({ id: 'b' }), fixture({ id: 'c' })];
    const r3 = render(<AttachedImageCard attachments={items3} />);
    expect(r3.container.querySelector('ul')?.className).toMatch(/flex-wrap/);
    expect(r3.container.querySelectorAll('img').length).toBe(3);
  });

  it('renders every thumbnail at the fixed w-32 square size (matches AttachedGameCard)', () => {
    // Size parity with the game board thumbnail is the contract: every
    // image — regardless of cardinality — is a w-32 (128px) square crop.
    const items = [fixture({ id: 'a' }), fixture({ id: 'b' })];
    const single = render(<AttachedImageCard attachments={[fixture()]} />);
    for (const img of single.container.querySelectorAll('img')) {
      expect(img.className).toMatch(/\bw-32\b/);
      expect(img.className).toMatch(/aspect-square/);
      expect(img.className).toMatch(/object-cover/);
      expect(img.className).not.toMatch(/max-h-/);
    }
    cleanup();
    const multi = render(<AttachedImageCard attachments={items} />);
    for (const img of multi.container.querySelectorAll('img')) {
      expect(img.className).toMatch(/\bw-32\b/);
      expect(img.className).toMatch(/aspect-square/);
    }
  });

  it('uses attachment.id as the React key (one <li> per id)', () => {
    const items = [
      fixture({ id: 'k-1', publicUrl: 'https://example.test/k1.jpg' }),
      fixture({ id: 'k-2', publicUrl: 'https://example.test/k2.jpg' }),
      fixture({ id: 'k-3', publicUrl: 'https://example.test/k3.jpg' }),
    ];
    const { container } = render(<AttachedImageCard attachments={items} />);
    const lis = container.querySelectorAll('li');
    expect(lis.length).toBe(3);
  });

  it('forwards displayOrder ordering: caller-supplied order is preserved', () => {
    // The aggregator sorts by displayOrder asc; the renderer must NOT
    // re-sort. Pass an out-of-order array and check the rendered DOM
    // order matches the input order, not the displayOrder field.
    const items = [
      fixture({ id: 'z', publicUrl: 'https://example.test/z.jpg', displayOrder: 2 }),
      fixture({ id: 'a', publicUrl: 'https://example.test/a.jpg', displayOrder: 0 }),
      fixture({ id: 'm', publicUrl: 'https://example.test/m.jpg', displayOrder: 1 }),
    ];
    const { container } = render(<AttachedImageCard attachments={items} />);
    const srcs = Array.from(container.querySelectorAll('img')).map((img) =>
      img.getAttribute('src')
    );
    expect(srcs).toEqual([
      'https://example.test/z.jpg',
      'https://example.test/a.jpg',
      'https://example.test/m.jpg',
    ]);
  });

  // ─── Lightbox (click-to-view) ─────────────────────────────────────────

  it('opens a fullscreen lightbox dialog when a thumbnail is clicked', () => {
    render(
      <AttachedImageCard
        attachments={[fixture({ id: 'a', publicUrl: 'https://example.test/a.jpg' })]}
      />
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    const thumb = document.querySelector(
      'button[aria-label="View image full size"]'
    ) as HTMLButtonElement;
    fireEvent.click(thumb);
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    const lightboxImg = dialog?.querySelector('img');
    expect(lightboxImg?.getAttribute('src')).toBe('https://example.test/a.jpg');
  });

  it('closes the lightbox on Escape', () => {
    render(<AttachedImageCard attachments={[fixture()]} />);
    fireEvent.click(
      document.querySelector('button[aria-label="View image full size"]') as HTMLButtonElement
    );
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders prev/next + counter for multiple images and advances on Next', () => {
    const items = [
      fixture({ id: 'a', publicUrl: 'https://example.test/a.jpg' }),
      fixture({ id: 'b', publicUrl: 'https://example.test/b.jpg' }),
    ];
    render(<AttachedImageCard attachments={items} />);
    const thumbs = document.querySelectorAll('button[aria-label="View image full size"]');
    fireEvent.click(thumbs[0] as HTMLButtonElement);
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.textContent).toContain('1 / 2');
    fireEvent.click(dialog.querySelector('button[aria-label="Next image"]') as HTMLButtonElement);
    expect(dialog.querySelector('img')?.getAttribute('src')).toBe('https://example.test/b.jpg');
    expect(dialog.textContent).toContain('2 / 2');
  });

  it('shows no prev/next controls for a single image', () => {
    render(<AttachedImageCard attachments={[fixture()]} />);
    fireEvent.click(
      document.querySelector('button[aria-label="View image full size"]') as HTMLButtonElement
    );
    expect(document.querySelector('button[aria-label="Next image"]')).toBeNull();
    expect(document.querySelector('button[aria-label="Previous image"]')).toBeNull();
  });

  it('preserves altText with special characters (XSS-relevant chars are passed as text)', () => {
    // React text-child escaping is the second layer of defense even
    // after sanitization. Pin that potentially-dangerous chars in
    // altText survive but are NOT interpreted as markup.
    const items = [
      fixture({ altText: '<script>alert(1)</script>', publicUrl: 'https://example.test/s.jpg' }),
    ];
    const { container } = render(<AttachedImageCard attachments={items} />);
    const img = container.querySelector('img');
    expect(img?.getAttribute('alt')).toBe('<script>alert(1)</script>');
    // No actual <script> tag should have been rendered.
    expect(container.querySelector('script')).toBeNull();
  });
});
