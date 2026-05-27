import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BoardAnnotationOverlay } from './BoardAnnotationOverlay';
import { EMPTY_BOARD_ANNOTATIONS } from './types';

describe('BoardAnnotationOverlay', () => {
  it('renders nothing for empty annotations', () => {
    const { container } = render(<BoardAnnotationOverlay annotations={EMPTY_BOARD_ANNOTATIONS} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders an svg with one path per arrow and one circle per circle', () => {
    const { container } = render(
      <BoardAnnotationOverlay
        annotations={{
          arrows: [
            { from: 'e2', to: 'e4', color: 'green' },
            { from: 'g1', to: 'f3', color: 'red' },
          ],
          circles: [{ square: 'd5', color: 'yellow' }],
        }}
      />
    );
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(container.querySelectorAll('path')).toHaveLength(2);
    expect(container.querySelectorAll('circle')).toHaveLength(1);
  });

  it('positions an arrow on the correct visual cell when not flipped', () => {
    // e2 → e4. From white's POV: file e = col 4, rank 2 = row 6; rank 4 = row 4.
    // Centers: (45, 65) and (45, 45). The path's M (start) is offset by 1 along the
    // unit vector (0, -1), so M ≈ (45, 64).
    const { container } = render(
      <BoardAnnotationOverlay
        annotations={{
          arrows: [{ from: 'e2', to: 'e4', color: 'green' }],
          circles: [],
        }}
      />
    );
    const path = container.querySelector('path');
    expect(path).not.toBeNull();
    const d = path!.getAttribute('d') ?? '';
    expect(d.startsWith('M 45 64')).toBe(true);
  });

  it('positions a circle on the correct visual cell when flipped', () => {
    // d5 from black's POV: col = 7 - 3 = 4, row = (5-1) = 4. Center = (45, 45).
    const { container } = render(
      <BoardAnnotationOverlay
        annotations={{ arrows: [], circles: [{ square: 'd5', color: 'red' }] }}
        flipped
      />
    );
    const circle = container.querySelector('circle');
    expect(circle).not.toBeNull();
    expect(circle!.getAttribute('cx')).toBe('45');
    expect(circle!.getAttribute('cy')).toBe('45');
  });

  it('marks the overlay as decorative (aria-hidden)', () => {
    const { container } = render(
      <BoardAnnotationOverlay
        annotations={{
          arrows: [{ from: 'e2', to: 'e4', color: 'green' }],
          circles: [],
        }}
      />
    );
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });
});
