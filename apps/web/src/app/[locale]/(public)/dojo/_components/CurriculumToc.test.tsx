import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CURRICULUM } from '@/lib/db/data/curriculum';
import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';

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

  it('renders every rank in CURRICULUM (as a section row or placeholder)', () => {
    const { container } = renderToc();
    for (const { slug } of CURRICULUM) {
      const rows = container.querySelectorAll(`[data-rank="${slug}"]`);
      expect(rows.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('renders section rows as links pointing to the rank guide', () => {
    const { container } = renderToc();
    const link = container.querySelector('a[href="/en/guides/ranks/5kyu"]');
    expect(link).not.toBeNull();
    expect(link!.textContent).toContain('section:anchorPoints');
  });

  it('renders a disabled (non-link) row when the rank guide is missing', () => {
    const { container } = renderToc({
      guideHrefBySlug: buildGuideHrefs({ '5kyu': null }),
    });
    const fivekyuRow = container.querySelector('[data-rank="5kyu"]');
    expect(fivekyuRow).not.toBeNull();
    expect(fivekyuRow!.getAttribute('data-disabled')).toBe('true');
    // Should not contain an anchor element
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

  it('renders a coming-soon placeholder row for ranks with empty sections', () => {
    const { container } = renderToc();
    for (const slug of ['2kyu', '1kyu', '1dan'] as const) {
      const row = container.querySelector(`[data-rank="${slug}"]`);
      expect(row).not.toBeNull();
      expect(row!.getAttribute('data-disabled')).toBe('true');
      expect(row!.textContent).toContain('Coming soon');
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
