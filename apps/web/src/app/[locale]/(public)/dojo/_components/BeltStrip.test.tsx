import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { BELT_COLOR_HEX, RANK_COLORS } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';

import { BeltStrip } from './BeltStrip';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

const expectedHex = (slug: RankSlug) => BELT_COLOR_HEX[RANK_COLORS[slug]];

describe('BeltStrip', () => {
  it('renders the rank label', () => {
    render(<BeltStrip slug="3kyu" rankName="3級" />);
    expect(screen.getByText('3級')).toBeInTheDocument();
  });

  it.each([
    ['5kyu' as RankSlug, '5 kyu'],
    ['4kyu' as RankSlug, '4 kyu'],
    ['3kyu' as RankSlug, '3 kyu'],
    ['2kyu' as RankSlug, '2 kyu'],
    ['1kyu' as RankSlug, '1 kyu'],
    ['1dan' as RankSlug, '1 dan'],
  ])(
    'fills the badge circle with the belt color for %s, not just the icon outline',
    (slug, label) => {
      render(<BeltStrip slug={slug} rankName={label} />);
      const icon = screen.getByTestId('belt-strip-icon');
      const expected = expectedHex(slug);

      // The icon's path is thin line art — filling only the icon leaves a
      // near-invisible outline (this is the bug: a 1dan/black belt read as a
      // blank "white belt"). The circular badge itself must carry the belt
      // color as a solid background, with the icon rendered in a contrasting
      // white on top.
      const wrapper = icon.parentElement;
      expect(wrapper).toHaveStyle({ backgroundColor: expected });
      expect(icon.getAttribute('fill')).toBe('#ffffff');
      expect(icon.getAttribute('stroke')).toBe('#ffffff');
      expect(icon).toHaveStyle({ color: '#ffffff' });

      const container = screen.getByTestId('belt-strip');
      expect(container.getAttribute('data-belt-slug')).toBe(slug);
      expect(container.getAttribute('data-belt-color')).toBe(expected);

      // Non-white belts should not have the white-belt-only background fill.
      expect(wrapper?.className ?? '').not.toContain('bg-muted');
    }
  );

  it('renders mukyu as a white belt with a filled background container', () => {
    render(<BeltStrip slug="mukyu" rankName="無級" />);
    const icon = screen.getByTestId('belt-strip-icon');
    expect(icon.getAttribute('fill')).toBe('#ffffff');
    // White belt path wraps the icon in a theme-aware background-filled
    // container (not a border) so it stays visible on light backgrounds.
    const wrapper = icon.parentElement;
    expect(wrapper?.className).toContain('bg-muted');
    expect(wrapper?.className ?? '').not.toMatch(/\bborder\b/);
  });
});
