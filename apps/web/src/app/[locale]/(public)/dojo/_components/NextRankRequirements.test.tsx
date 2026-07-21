import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type {
  RequirementDivider,
  RequirementItem,
} from '@/app/[locale]/(public)/dojo/ranks/_components/RequirementsList';

import { NextRankRequirements } from './NextRankRequirements';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

const BELT = '#ff8800';

const items: RequirementItem[] = [
  { label: 'Score 15+ in Square Colors', href: '/en/practice/square-colors' },
  { label: 'Score 20+ in Coordinate Quiz', href: '/en/practice/coordinate-quiz' },
  { label: 'Score 10+ in Diagonal Quiz', href: '/en/practice/diagonal-quiz' },
];

describe('NextRankRequirements', () => {
  it('renders one row per item as a single outer link with correct href', () => {
    render(<NextRankRequirements items={items} beltColor={BELT} />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(items.length);

    for (const item of items) {
      const label = screen.getByText(item.label);
      const link = label.closest('a');
      expect(link).not.toBeNull();
      expect(link).toHaveAttribute('href', item.href!);
      // Only a single anchor per row (no nested <a>).
      const row = link!.closest('li');
      expect(row).not.toBeNull();
      expect(row!.querySelectorAll('a').length).toBe(1);
    }
  });

  it('renders a belt-colored bullet on each row using the provided beltColor', () => {
    const { container } = render(<NextRankRequirements items={items} beltColor={BELT} />);
    const dots = container.querySelectorAll('[data-testid="next-rank-belt-dot"]');
    expect(dots.length).toBe(items.length);
    for (const dot of dots) {
      expect(dot.getAttribute('data-belt-color')).toBe(BELT);
    }
  });

  it('renders static (non-link) rows when href is missing', () => {
    const staticItems: RequirementItem[] = [{ label: 'Complete a secret quest' }];
    render(<NextRankRequirements items={staticItems} beltColor={BELT} />);

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Complete a secret quest')).toBeInTheDocument();
  });

  it('renders an or-divider row as plain text with no link and no belt dot', () => {
    const divider: RequirementDivider = { kind: 'or', label: 'or' };
    const mixedItems: (RequirementItem | RequirementDivider)[] = [
      { label: 'Post a position-memory problem', href: '/en/practice/position-memory/new' },
      divider,
      { label: 'Post a puzzle', href: '/en/practice/puzzle/new' },
    ];
    render(<NextRankRequirements items={mixedItems} beltColor={BELT} />);

    expect(screen.getAllByRole('link')).toHaveLength(2);
    const dividerRow = screen.getByText('or');
    expect(dividerRow.closest('a')).toBeNull();
    expect(
      dividerRow.closest('li')?.querySelector('[data-testid="next-rank-belt-dot"]')
    ).toBeNull();
  });
});
