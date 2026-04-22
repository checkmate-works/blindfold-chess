/**
 * Behavioural tests for `renderGuideBody`.
 *
 * Strategy: we mock every heavy external dependency (i18n translator, board
 * components, inline-link and visual-aid registries, DB requirement lookup)
 * so the test focuses on the renderer's own branching logic:
 *
 * - "last page shows the tryChallenge CTA"
 * - "single-page flat guide does NOT render a pagination bar"
 * - "non-last flat page does NOT render the CTA"
 * - "chapter-list does not hit the DB for requirements"
 *
 * We use a synthetic `mukyu` slug so `isMukyuSlug` short-circuits the DB
 * call inside `loadRequirements`. For the DB-backed CTA test we use `5kyu`
 * and mock `getValidatedRank`.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// SUT
// ---------------------------------------------------------------------------

import { renderGuideBody } from './renderGuideBody';

// ---------------------------------------------------------------------------
// Module mocks — MUST be declared before the SUT import.
// ---------------------------------------------------------------------------

// The renderer asks next-intl for two namespaces: 'ranks' and 'guides'.
// We return a translator that maps known keys to deterministic strings so
// assertions can look for them in the rendered DOM.
let syntheticGuide: unknown = null;
vi.mock('next-intl/server', () => ({
  getTranslations: async ({ namespace }: { namespace: string }) => {
    const translate = (key: string, values?: Record<string, string | number>) => {
      if (namespace === 'ranks') {
        if (key === 'rankNames.mukyu') return 'Unranked';
        if (key === 'rankNames.5kyu') return '5th Kyū';
        if (key === 'detail.tryChallenge') return 'Try the Challenge';
        if (key === 'detail.pageOf') return `Page ${values?.current} of ${values?.total}`;
        if (key === 'challengeScore') return `score>=${values?.minScore}`;
        if (key.startsWith('challengeNames.')) return key.replace('challengeNames.', '');
        return key;
      }
      if (namespace === 'guides') {
        if (key === 'ranks.indexTitle') return 'Guide';
        if (key === 'ranks.chapterListHeading') return 'Chapters';
        if (key === 'breadcrumb.guides') return 'Guides';
        return key;
      }
      return key;
    };
    return Object.assign(translate, {
      raw: (key: string) => {
        if (namespace === 'guides' && key === 'pages') {
          // The fixture changes per test; the closed-over binding is set
          // before the renderer is called.
          return { mukyu: syntheticGuide, '5kyu': syntheticGuide };
        }
        return undefined;
      },
    });
  },
}));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

// `JsonLd` emits an inline `<script type="application/ld+json">`. Stub it
// out — this test cares about layout / CTA branching, not the JSON-LD
// payload. This mock also silences the `<script>` rendering noise in the
// jsdom output so assertions target visible UI only.
vi.mock('@/lib/seo/jsonld', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/seo/jsonld')>();
  return {
    ...actual,
    JsonLd: () => null,
  };
});

// Stub board visuals so we don't pull the whole ranks/_components tree.
vi.mock('@/app/[locale]/(public)/ranks/_components/GuideLinkCard', () => ({
  GuideLinkCard: ({ items }: { items: Array<{ label: string; href: string }> }) => (
    <div data-testid="guide-link-card">
      {items.map((i) => (
        <a key={i.href} href={i.href}>
          {i.label}
        </a>
      ))}
    </div>
  ),
}));
vi.mock('@/app/[locale]/(public)/ranks/_components/RankHeader', () => ({
  RankHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="rank-header">{children}</div>
  ),
}));
vi.mock('@/app/[locale]/(public)/ranks/_components/RequirementsList', () => ({
  RequirementsList: ({ items }: { items: Array<{ label: string }> }) => (
    <ul data-testid="requirements-list">
      {items.map((i, idx) => (
        <li key={idx}>{i.label}</li>
      ))}
    </ul>
  ),
}));

vi.mock('@/app/[locale]/(public)/ranks/_lib/helpers', () => ({
  buildRequirementItems: (reqs: Array<{ minScore: number; menuType: string }>) =>
    reqs.map((r) => ({ label: `score>=${r.minScore} ${r.menuType}`, href: '/x' })),
  getBeltColorHex: () => '#abcdef',
}));

const getValidatedRankMock = vi.fn();
vi.mock('@/app/[locale]/(public)/ranks/_lib/queries', () => ({
  getValidatedRank: (...args: unknown[]) => getValidatedRankMock(...args),
}));

// Footer: stub out the AdSense/Divider/Breadcrumb stack to keep the DOM lean.
vi.mock('@/app/[locale]/(public)/guides/_components/GuidePageFooter', () => ({
  GuidePageFooter: ({ items }: { items: Array<{ label: string; href?: string }> }) => (
    <nav data-testid="guide-page-footer">
      {items.map((i, idx) => (
        <span key={idx}>{i.label}</span>
      ))}
    </nav>
  ),
}));

// Swap the shared UI primitives for minimal stand-ins.
vi.mock('@/app/[locale]/_components', () => ({
  Divider: () => <hr data-testid="divider" />,
  PagePanel: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  PageTitle: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  PaginationNav: ({ totalPages }: { totalPages: number }) => (
    <nav data-testid="pagination-nav" data-total={totalPages} />
  ),
  SectionTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

// Paragraph-level registries return nothing: we only care about layer logic.
vi.mock('./paragraphInlineLinks', () => ({
  getGuideInlineLink: () => null,
}));
vi.mock('./paragraphVisualAids', () => ({
  getVisualAid: () => null,
}));

afterEach(() => {
  cleanup();
  getValidatedRankMock.mockReset();
  syntheticGuide = null;
});

async function renderAsync(
  result: ReturnType<typeof renderGuideBody>
): Promise<ReturnType<typeof render>> {
  const node = await result;
  return render(node as React.ReactElement);
}

describe('renderGuideBody — flat layer', () => {
  beforeEach(() => {
    syntheticGuide = {
      format: 'flat',
      pages: [
        { paragraphs: ['Intro paragraph.'] },
        { paragraphs: ['Middle paragraph.'] },
        { paragraphs: ['Final paragraph.'] },
      ],
    };
  });

  it('renders the pagination bar when the guide has more than one page', async () => {
    await renderAsync(
      renderGuideBody({ kind: 'flat', locale: 'en', slug: 'mukyu', pageNumber: 2 })
    );
    const pag = screen.getByTestId('pagination-nav');
    expect(pag.getAttribute('data-total')).toBe('3');
  });

  it('does NOT render pagination for a single-page flat guide', async () => {
    syntheticGuide = {
      format: 'flat',
      pages: [{ paragraphs: ['The one and only page.'] }],
    };
    await renderAsync(
      renderGuideBody({ kind: 'flat', locale: 'en', slug: 'mukyu', pageNumber: 1 })
    );
    expect(screen.queryByTestId('pagination-nav')).toBeNull();
  });

  it('does NOT render the tryChallenge CTA on a non-last page', async () => {
    await renderAsync(
      renderGuideBody({ kind: 'flat', locale: 'en', slug: 'mukyu', pageNumber: 2 })
    );
    expect(screen.queryByText('Try the Challenge')).toBeNull();
    expect(screen.queryByTestId('requirements-list')).toBeNull();
  });

  it('does NOT render the CTA even on the last page for mukyu (UI-only rank)', async () => {
    await renderAsync(
      renderGuideBody({ kind: 'flat', locale: 'en', slug: 'mukyu', pageNumber: 3 })
    );
    // Mukyu has no DB row; the renderer skips the CTA for it entirely.
    expect(screen.queryByText('Try the Challenge')).toBeNull();
  });

  it('renders the tryChallenge CTA on the last page for a DB-backed rank', async () => {
    getValidatedRankMock.mockResolvedValue({
      rank: { id: 'r1' },
      rankSlug: '5kyu',
      requirements: [{ type: 'challenge_score', menuType: 'coordinate_quiz', minScore: 800 }],
    });
    await renderAsync(renderGuideBody({ kind: 'flat', locale: 'en', slug: '5kyu', pageNumber: 3 }));
    expect(screen.getByText('Try the Challenge')).toBeTruthy();
    const list = screen.getByTestId('requirements-list');
    expect(list.textContent).toContain('800');
    expect(getValidatedRankMock).toHaveBeenCalledWith('5kyu');
  });

  it('calls notFound when the requested page exceeds the guide length', async () => {
    await expect(
      renderGuideBody({ kind: 'flat', locale: 'en', slug: 'mukyu', pageNumber: 99 })
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

describe('renderGuideBody — chapter-list layer', () => {
  beforeEach(() => {
    syntheticGuide = {
      format: 'chaptered',
      chapters: [
        {
          slug: 'diagonal',
          title: 'Diagonal',
          description: 'Learn diagonals',
          pages: [{ paragraphs: ['a'] }],
        },
        {
          slug: 'maneuvering',
          title: 'Maneuvering',
          description: 'Learn maneuvers',
          pages: [{ paragraphs: ['b'] }],
        },
      ],
    };
  });

  it('does NOT fetch requirements from the DB (no unnecessary round-trip)', async () => {
    await renderAsync(renderGuideBody({ kind: 'chapter-list', locale: 'en', slug: '5kyu' }));
    expect(getValidatedRankMock).not.toHaveBeenCalled();
  });

  it('throws a loud Error (not a 404) when asked to render a chapter list for a flat guide', async () => {
    syntheticGuide = { format: 'flat', pages: [{ paragraphs: ['x'] }] };
    await expect(
      renderGuideBody({ kind: 'chapter-list', locale: 'en', slug: 'mukyu' })
    ).rejects.toThrow(/chapter-list.*requires a chaptered guide/);
  });
});
