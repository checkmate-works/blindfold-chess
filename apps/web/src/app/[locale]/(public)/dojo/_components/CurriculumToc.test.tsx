import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CURRICULUM } from '@/lib/db/data/curriculum';
import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';

import { getBeltColorHex } from '@/app/[locale]/(public)/ranks/_lib/helpers';

import { CurriculumToc } from './CurriculumToc';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

const rankName = (slug: RankSlug) => `name:${slug}`;
const sectionTitle = (key: string) => `section:${key}`;

// Default: every rank in ALL_RANK_SLUGS has a fake guide path. Individual
// tests can override this to simulate missing guides.
function buildGuideHrefs(
  overrides: Partial<Record<RankSlug, string | null>> = {}
): Partial<Record<RankSlug, string | null>> {
  const map: Partial<Record<RankSlug, string | null>> = {};
  for (const slug of ALL_RANK_SLUGS) {
    map[slug] = `/en/guides/ranks/${slug}`;
  }
  return { ...map, ...overrides };
}

function renderToc({
  achieved = new Set<RankSlug>(),
  nextSlug = null as RankSlug | null,
  guideHrefBySlug = buildGuideHrefs(),
}: {
  achieved?: ReadonlySet<RankSlug>;
  nextSlug?: RankSlug | null;
  guideHrefBySlug?: Partial<Record<RankSlug, string | null>>;
} = {}) {
  return render(
    <CurriculumToc
      achievedSlugs={achieved}
      nextSlug={nextSlug}
      rankName={rankName}
      sectionTitle={sectionTitle}
      emptyLabel="Coming soon"
      achievedLabel="Achieved"
      guideHrefBySlug={guideHrefBySlug}
    />
  );
}

describe('CurriculumToc', () => {
  it('renders a flat list without <details> elements', () => {
    const { container } = renderToc();
    expect(container.querySelectorAll('details').length).toBe(0);
    // One <ol> with one <li> per expected row.
    const ol = container.querySelector('ol');
    expect(ol).not.toBeNull();
    const expectedRows = CURRICULUM.reduce(
      (sum, { sections }) => sum + Math.max(sections.length, 1),
      0
    );
    expect(ol!.querySelectorAll(':scope > li').length).toBe(expectedRows);
  });

  it('renders as a plain list without a bordered card container or row dividers', () => {
    const { container } = renderToc();
    const ol = container.querySelector('ol')!;
    // No card-like container classes on the outer list.
    expect(ol.className).not.toMatch(/rounded-lg/);
    expect(ol.className).not.toMatch(/\bshadow/);
    expect(ol.className).not.toMatch(/\bbg-card\b/);

    // No row (or inner content) should use `border-t` dividers.
    const rows = ol.querySelectorAll(':scope > li');
    for (const row of rows) {
      expect(row.className ?? '').not.toMatch(/border-t/);
      const inner = row.querySelector('a, :scope > *');
      expect(inner?.className ?? '').not.toMatch(/border-t/);
    }
  });

  it('renders every rank in CURRICULUM (as a section row or placeholder)', () => {
    const { container } = renderToc();
    for (const { slug } of CURRICULUM) {
      const rows = container.querySelectorAll(`[data-rank="${slug}"]`);
      expect(rows.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('wraps only the section title in a link (bullet and rank name are not inside the anchor)', () => {
    const { container } = renderToc();
    const row = container.querySelector('[data-rank="5kyu"]')!;
    // Exactly one anchor per row, and it points at the rank guide.
    const anchors = row.querySelectorAll('a');
    expect(anchors.length).toBe(1);
    const link = anchors[0];
    expect(link.getAttribute('href')).toBe('/en/guides/ranks/5kyu');
    // The link wraps the section title text only — not the rank label.
    expect(link.textContent).toBe('section:anchorPoints');
    expect(link.textContent).not.toContain('name:5kyu');

    // The belt bullet and rank name label must NOT be descendants of the anchor.
    expect(link.querySelector('[data-testid="curriculum-belt-dot"]')).toBeNull();
    const rankLabel = Array.from(row.querySelectorAll('span')).find(
      (el) => el.textContent === 'name:5kyu'
    );
    expect(rankLabel).toBeDefined();
    expect(link.contains(rankLabel!)).toBe(false);
  });

  it('renders a vertical dashed line element on the outer list', () => {
    const { container } = renderToc();
    const line = container.querySelector('[data-testid="curriculum-dashed-line"]');
    expect(line).not.toBeNull();
    expect(line!.getAttribute('aria-hidden')).toBe('true');
    expect(line!.className).toMatch(/border-dashed/);
    expect(line!.className).toMatch(/border-l/);
    // Sits inside the <ol>, not outside it.
    const ol = container.querySelector('ol');
    expect(ol!.contains(line)).toBe(true);
  });

  it('each row has a belt-colored bullet matching the row rank slug', () => {
    const { container } = renderToc();
    const row = container.querySelector('[data-rank="5kyu"]')!;
    const dot = row.querySelector('[data-testid="curriculum-belt-dot"]');
    expect(dot).not.toBeNull();
    expect(dot!.getAttribute('data-belt-color')).toBe(getBeltColorHex('5kyu'));
  });

  it('top label is the rank name and bottom is the section title', () => {
    const { container } = renderToc();
    const row = container.querySelector('[data-rank="5kyu"]')!;
    expect(row.textContent).toContain('name:5kyu');
    expect(row.textContent).toContain('section:anchorPoints');
  });

  it('renders a disabled (non-link) row when the rank guide is missing', () => {
    const { container } = renderToc({
      guideHrefBySlug: buildGuideHrefs({ '5kyu': null }),
    });
    const fivekyuRow = container.querySelector('[data-rank="5kyu"]');
    expect(fivekyuRow).not.toBeNull();
    expect(fivekyuRow!.getAttribute('data-disabled')).toBe('true');
    expect(fivekyuRow!.querySelector('a')).toBeNull();
  });

  it('highlights the current next rank with data-next', () => {
    const { container } = renderToc({ nextSlug: '4kyu' });
    const nextRows = container.querySelectorAll('[data-next="true"]');
    expect(nextRows.length).toBeGreaterThanOrEqual(1);
    for (const row of Array.from(nextRows)) {
      expect(row.getAttribute('data-rank')).toBe('4kyu');
    }
  });

  it('shows a check mark for achieved ranks (including mukyu)', () => {
    renderToc({
      achieved: new Set<RankSlug>(['5kyu', '4kyu']),
      nextSlug: '3kyu',
    });
    const checks = screen.getAllByTestId('curriculum-achieved-mark');
    // mukyu (always achieved) + 5kyu + 4kyu = 3 achieved rows, each with one
    // section row → 3 checks.
    expect(checks.length).toBe(3);
  });

  it('renders a coming-soon placeholder row (non-clickable) for ranks with empty sections', () => {
    const { container } = renderToc();
    for (const slug of ['2kyu', '1kyu', '1dan'] as const) {
      const row = container.querySelector(`[data-rank="${slug}"]`);
      expect(row).not.toBeNull();
      expect(row!.getAttribute('data-disabled')).toBe('true');
      expect(row!.textContent).toContain('Coming soon');
      // Non-clickable coming-soon rows must not contain an anchor.
      expect(row!.querySelector('a')).toBeNull();
    }
  });

  it('renders section titles for ranks with defined sections', () => {
    renderToc();
    expect(screen.getByText('section:algebraicNotation')).toBeInTheDocument();
    expect(screen.getByText('section:anchorPoints')).toBeInTheDocument();
    expect(screen.getByText('section:blindfoldLegalMoves')).toBeInTheDocument();
    expect(screen.getByText('section:diagonals')).toBeInTheDocument();
  });
});
