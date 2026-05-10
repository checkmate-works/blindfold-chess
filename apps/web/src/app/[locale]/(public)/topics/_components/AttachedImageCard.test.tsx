import { cleanup, render } from '@testing-library/react';
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

  // ─── Cardinality / layout pins (Tester Phase 1) ────────────────────────

  it('renders a 1-col layout for cardinality 1', () => {
    const { container } = render(<AttachedImageCard attachments={[fixture()]} />);
    const ul = container.querySelector('ul');
    // The 1-image branch picks `grid-cols-1`; the 2+ branch picks
    // `grid-cols-2 sm:grid-cols-3`. Pin the class so a refactor can't
    // silently flatten the visual contrast.
    expect(ul?.className).toMatch(/grid-cols-1/);
    expect(ul?.className).not.toMatch(/grid-cols-2/);
  });

  it('renders a 2-col / sm:3-col layout for cardinality 2 and 3', () => {
    const items2 = [fixture({ id: 'a' }), fixture({ id: 'b' })];
    const items3 = [fixture({ id: 'a' }), fixture({ id: 'b' }), fixture({ id: 'c' })];
    const r2 = render(<AttachedImageCard attachments={items2} />);
    expect(r2.container.querySelector('ul')?.className).toMatch(/grid-cols-2/);
    expect(r2.container.querySelector('ul')?.className).toMatch(/sm:grid-cols-3/);
    cleanup();
    const r3 = render(<AttachedImageCard attachments={items3} />);
    expect(r3.container.querySelector('ul')?.className).toMatch(/grid-cols-2/);
    expect(r3.container.querySelector('ul')?.className).toMatch(/sm:grid-cols-3/);
    expect(r3.container.querySelectorAll('img').length).toBe(3);
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
