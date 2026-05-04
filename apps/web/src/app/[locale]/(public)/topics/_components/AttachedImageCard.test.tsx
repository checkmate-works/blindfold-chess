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
});
