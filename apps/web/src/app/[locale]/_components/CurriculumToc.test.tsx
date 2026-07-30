import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CURRICULUM } from '@/lib/db/data/curriculum';
import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';

import { getBeltColorHex } from '@/app/[locale]/(public)/dojo/ranks/_lib/belt-colors';

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
    map[slug] = `/en/dojo/guides/${slug}`;
  }
  return { ...map, ...overrides };
}

type RenderOpts = {
  achieved?: ReadonlySet<RankSlug>;
  nextSlug?: RankSlug | null;
  maxVisibleSlug?: RankSlug | null;
  guideHrefBySlug?: Partial<Record<RankSlug, string | null>>;
  userAware?: boolean;
};

function renderToc({
  achieved,
  nextSlug,
  maxVisibleSlug,
  guideHrefBySlug = buildGuideHrefs(),
  userAware = true,
}: RenderOpts = {}) {
  const userProps = userAware
    ? {
        achievedSlugs: achieved ?? new Set<RankSlug>(),
        nextSlug: nextSlug ?? null,
      }
    : {};
  return render(
    <CurriculumToc
      {...userProps}
      maxVisibleSlug={maxVisibleSlug}
      rankName={rankName}
      sectionTitle={sectionTitle}
      achievedLabel="Achieved"
      guideHrefBySlug={guideHrefBySlug}
    />
  );
}

/** Slugs that actually render: only ranks with at least one curriculum section. */
const RANKS_WITH_SECTIONS = CURRICULUM.filter(({ sections }) => sections.length > 0);

describe('CurriculumToc', () => {
  it('renders a flat list without <details> elements', () => {
    const { container } = renderToc();
    expect(container.querySelectorAll('details').length).toBe(0);
    // One <ol> with one <li> per curriculum section — section-less ranks
    // are omitted entirely, never shown as placeholders.
    const ol = container.querySelector('ol');
    expect(ol).not.toBeNull();
    const expectedRows = CURRICULUM.reduce((sum, { sections }) => sum + sections.length, 0);
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

  it('renders every rank that has curriculum sections', () => {
    const { container } = renderToc();
    for (const { slug } of RANKS_WITH_SECTIONS) {
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
    expect(link.getAttribute('href')).toBe('/en/dojo/guides/5kyu');
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

  it('shows a check mark for every slug present in achievedSlugs', () => {
    renderToc({
      achieved: new Set<RankSlug>(['5kyu', '4kyu']),
      nextSlug: '3kyu',
    });
    const checks = screen.getAllByTestId('curriculum-achieved-mark');
    // 5kyu + 4kyu = 2 achieved rows, each with one section row → 2 checks.
    // mukyu is intentionally absent from this achievedSlugs set and must NOT
    // be auto-checked — its achieved-ness is the caller's decision (mirroring
    // the /ranks grid rule: mukyu counts as achieved only once the user
    // holds a real rank), not a hardcoded default inside CurriculumToc.
    expect(checks.length).toBe(2);
  });

  it('does not check mukyu when the caller omits it (e.g. a user with zero real ranks)', () => {
    const { container } = renderToc({ achieved: new Set<RankSlug>(), nextSlug: 'mukyu' });
    const mukyuRow = container.querySelector('[data-rank="mukyu"]');
    expect(mukyuRow).not.toBeNull();
    expect(mukyuRow!.querySelector('[data-testid="curriculum-achieved-mark"]')).toBeNull();
  });

  it('checks mukyu when the caller includes it (e.g. a user who has earned a real rank)', () => {
    renderToc({
      achieved: new Set<RankSlug>(['5kyu', 'mukyu']),
      nextSlug: '4kyu',
    });
    const checks = screen.getAllByTestId('curriculum-achieved-mark');
    // mukyu + 5kyu = 2 achieved rows, each with one section row → 2 checks.
    expect(checks.length).toBe(2);
  });

  it('omits ranks with no curriculum sections — no "coming soon" placeholder anywhere', () => {
    // A rank without study material (1dan today) must simply be absent: an
    // achieved 1dan holder's dojo showing 「初段・近日公開」 was the bug.
    const { container } = renderToc();
    for (const slug of ['1dan'] as const) {
      expect(container.querySelector(`[data-rank="${slug}"]`)).toBeNull();
    }
    expect(screen.queryByText('Coming soon')).toBeNull();
    // Ranks with real sections are unaffected.
    expect(container.querySelector('[data-rank="1kyu"]')).not.toBeNull();
  });

  it('still omits section-less ranks when they are achieved (user-aware mode)', () => {
    const { container } = renderToc({
      achieved: new Set<RankSlug>(['1dan']),
      nextSlug: '5kyu',
    });
    expect(container.querySelector('[data-rank="1dan"]')).toBeNull();
  });

  it('renders 1kyu as a real section row', () => {
    const { container } = renderToc();
    const row = container.querySelector('[data-rank="1kyu"]');
    expect(row).not.toBeNull();
    expect(row!.getAttribute('data-disabled')).toBeNull();
    expect(row!.querySelector('a')).not.toBeNull();
  });

  it('renders section titles for ranks with defined sections', () => {
    renderToc();
    expect(screen.getByText('section:algebraicNotation')).toBeInTheDocument();
    expect(screen.getByText('section:anchorPoints')).toBeInTheDocument();
    expect(screen.getByText('section:blindfoldLegalMoves')).toBeInTheDocument();
    expect(screen.getByText('section:diagonals')).toBeInTheDocument();
    expect(screen.getByText('section:chunking')).toBeInTheDocument();
  });

  describe('plain mode (achievedSlugs and nextSlug omitted)', () => {
    it('renders no achievement check marks', () => {
      const { container } = renderToc({ userAware: false });
      expect(container.querySelectorAll('[data-testid="curriculum-achieved-mark"]').length).toBe(0);
    });

    it('renders no data-next attribute on any row', () => {
      const { container } = renderToc({ userAware: false });
      expect(container.querySelectorAll('[data-next="true"]').length).toBe(0);
    });

    it('renders every rank (no truncation)', () => {
      const { container } = renderToc({ userAware: false });
      for (const { slug } of RANKS_WITH_SECTIONS) {
        const rows = container.querySelectorAll(`[data-rank="${slug}"]`);
        expect(rows.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('truncation via maxVisibleSlug', () => {
    it('hides ranks with a level beyond maxVisibleSlug', () => {
      const { container } = renderToc({
        userAware: true,
        achieved: new Set<RankSlug>(['5kyu']),
        nextSlug: '4kyu',
        maxVisibleSlug: '4kyu',
      });
      // Visible: mukyu, 5kyu, 4kyu
      for (const slug of ['mukyu', '5kyu', '4kyu'] as const) {
        expect(container.querySelectorAll(`[data-rank="${slug}"]`).length).toBeGreaterThan(0);
      }
      // Hidden: 3kyu, 2kyu, 1kyu, 1dan
      for (const slug of ['3kyu', '2kyu', '1kyu', '1dan'] as const) {
        expect(container.querySelectorAll(`[data-rank="${slug}"]`).length).toBe(0);
      }
    });

    it('shows all ranks when maxVisibleSlug is omitted', () => {
      const { container } = renderToc({
        userAware: true,
        achieved: new Set<RankSlug>(),
        nextSlug: '5kyu',
      });
      for (const { slug } of RANKS_WITH_SECTIONS) {
        expect(container.querySelectorAll(`[data-rank="${slug}"]`).length).toBeGreaterThan(0);
      }
    });
  });
});
