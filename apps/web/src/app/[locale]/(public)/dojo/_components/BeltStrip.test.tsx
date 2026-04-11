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
  ])('applies the belt color for %s via the SVG fill attribute', (slug, label) => {
    render(<BeltStrip slug={slug} rankName={label} />);
    const icon = screen.getByTestId('belt-strip-icon');
    const expected = expectedHex(slug);

    // `fill` is set as a DOM attribute so the color is guaranteed to render
    // regardless of CSS cascade or `currentColor` inheritance.
    expect(icon.getAttribute('fill')).toBe(expected);
    expect(icon.getAttribute('stroke')).toBe(expected);
    expect(icon).toHaveStyle({ color: expected });

    const container = screen.getByTestId('belt-strip');
    expect(container.getAttribute('data-belt-slug')).toBe(slug);
    expect(container.getAttribute('data-belt-color')).toBe(expected);
  });

  it('renders mukyu as a white belt with a visible outlined container', () => {
    render(<BeltStrip slug="mukyu" rankName="無級" />);
    const icon = screen.getByTestId('belt-strip-icon');
    expect(icon.getAttribute('fill')).toBe('#ffffff');
    // White belt path wraps the icon in an outlined container so it stays
    // visible on light backgrounds.
    const wrapper = icon.parentElement;
    expect(wrapper?.className).toMatch(/border/);
  });
});
