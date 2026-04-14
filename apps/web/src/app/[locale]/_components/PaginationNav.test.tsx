import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PaginationNav } from './PaginationNav';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const buildHref = (page: number) => `/test?page=${page}`;

describe('PaginationNav', () => {
  it('renders nothing when totalPages is 1', () => {
    const { container } = render(
      <PaginationNav currentPage={1} totalPages={1} buildHref={buildHref} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when totalPages is 0', () => {
    const { container } = render(
      <PaginationNav currentPage={1} totalPages={0} buildHref={buildHref} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when totalPages is negative', () => {
    const { container } = render(
      <PaginationNav currentPage={1} totalPages={-1} buildHref={buildHref} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('has a nav element with aria-label', () => {
    render(<PaginationNav currentPage={1} totalPages={2} buildHref={buildHref} />);
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  });

  describe('Previous/Next buttons', () => {
    it('disables Previous on first page', () => {
      render(<PaginationNav currentPage={1} totalPages={3} buildHref={buildHref} />);
      const previous = screen.getByLabelText('Previous page');
      expect(previous.tagName).toBe('SPAN');
      expect(previous.className).toContain('cursor-not-allowed');
    });

    it('enables Previous on non-first page', () => {
      render(<PaginationNav currentPage={2} totalPages={3} buildHref={buildHref} />);
      const previous = screen.getByLabelText('Previous page');
      expect(previous.tagName).toBe('A');
      expect(previous).toHaveAttribute('href', '/test?page=1');
    });

    it('disables Next on last page', () => {
      render(<PaginationNav currentPage={3} totalPages={3} buildHref={buildHref} />);
      const next = screen.getByLabelText('Next page');
      expect(next.tagName).toBe('SPAN');
      expect(next.className).toContain('cursor-not-allowed');
    });

    it('enables Next on non-last page', () => {
      render(<PaginationNav currentPage={1} totalPages={3} buildHref={buildHref} />);
      const next = screen.getByLabelText('Next page');
      expect(next.tagName).toBe('A');
      expect(next).toHaveAttribute('href', '/test?page=2');
    });

    it('enables both Previous and Next on middle page', () => {
      render(<PaginationNav currentPage={2} totalPages={3} buildHref={buildHref} />);
      const previous = screen.getByLabelText('Previous page');
      const next = screen.getByLabelText('Next page');
      expect(previous.tagName).toBe('A');
      expect(next.tagName).toBe('A');
      expect(previous).toHaveAttribute('href', '/test?page=1');
      expect(next).toHaveAttribute('href', '/test?page=3');
    });
  });

  describe('page number links', () => {
    it('renders page numbers as links except for current page', () => {
      render(<PaginationNav currentPage={2} totalPages={5} buildHref={buildHref} />);

      // Page 1 should be a link
      const page1 = screen.getByText('1');
      expect(page1.tagName).toBe('A');
      expect(page1).toHaveAttribute('href', '/test?page=1');

      // Page 2 (current) should be a span with aria-current
      const page2 = screen.getByText('2');
      expect(page2.tagName).toBe('SPAN');
      expect(page2).toHaveAttribute('aria-current', 'page');

      // Page 3 should be a link
      const page3 = screen.getByText('3');
      expect(page3.tagName).toBe('A');
      expect(page3).toHaveAttribute('href', '/test?page=3');
    });

    it('highlights the current page with aria-current', () => {
      render(<PaginationNav currentPage={3} totalPages={5} buildHref={buildHref} />);
      const currentPage = screen.getByText('3');
      expect(currentPage).toHaveAttribute('aria-current', 'page');
      expect(currentPage.tagName).toBe('SPAN');
    });

    it('shows all pages when total is small (5 pages)', () => {
      render(<PaginationNav currentPage={3} totalPages={5} buildHref={buildHref} />);
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByText(String(i))).toBeInTheDocument();
      }
      // No ellipsis
      expect(screen.queryByText('...')).not.toBeInTheDocument();
    });

    it('shows ellipsis when total is 7', () => {
      render(<PaginationNav currentPage={4} totalPages={7} buildHref={buildHref} />);
      // surroundingPageCount=1: 1 ... 3 [4] 5 ... 7
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();

      const ellipses = screen.getAllByText('...');
      expect(ellipses).toHaveLength(2);

      expect(screen.queryByText('2')).not.toBeInTheDocument();
      expect(screen.queryByText('6')).not.toBeInTheDocument();
    });
  });

  describe('truncation with ellipsis', () => {
    it('shows ellipsis for large page counts when on first page', () => {
      render(<PaginationNav currentPage={1} totalPages={10} buildHref={buildHref} />);

      // Should show: 1 2 ... 10
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('...')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();

      // Should not show middle pages
      expect(screen.queryByText('3')).not.toBeInTheDocument();
      expect(screen.queryByText('5')).not.toBeInTheDocument();
    });

    it('shows ellipsis for large page counts when on last page', () => {
      render(<PaginationNav currentPage={10} totalPages={10} buildHref={buildHref} />);

      // Should show: 1 ... 9 10
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('...')).toBeInTheDocument();
      expect(screen.getByText('9')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();

      expect(screen.queryByText('5')).not.toBeInTheDocument();
      expect(screen.queryByText('8')).not.toBeInTheDocument();
    });

    it('shows two ellipses when current page is in the middle of a large set', () => {
      render(<PaginationNav currentPage={5} totalPages={10} buildHref={buildHref} />);

      // Should show: 1 ... 4 5 6 ... 10
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();

      const ellipses = screen.getAllByText('...');
      expect(ellipses).toHaveLength(2);

      // Should not show pages outside the window
      expect(screen.queryByText('2')).not.toBeInTheDocument();
      expect(screen.queryByText('3')).not.toBeInTheDocument();
      expect(screen.queryByText('7')).not.toBeInTheDocument();
    });

    it('does not show leading ellipsis when window touches first page', () => {
      render(<PaginationNav currentPage={2} totalPages={10} buildHref={buildHref} />);

      // surroundingPageCount=1: rangeStart=max(2,1)=2, rangeEnd=min(9,3)=3
      // No leading ellipsis (rangeStart=2), trailing ellipsis (rangeEnd=3<9)
      // Should show: 1 2 3 ... 10
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();

      const ellipses = screen.getAllByText('...');
      expect(ellipses).toHaveLength(1);

      expect(screen.queryByText('4')).not.toBeInTheDocument();
    });

    it('does not show trailing ellipsis when window touches last page', () => {
      render(<PaginationNav currentPage={9} totalPages={10} buildHref={buildHref} />);

      // surroundingPageCount=1: rangeStart=max(2,8)=8, rangeEnd=min(9,10)=9
      // Leading ellipsis (rangeStart=8>2), no trailing ellipsis (rangeEnd=9=totalPages-1)
      // Should show: 1 ... 8 9 10
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('9')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();

      const ellipses = screen.getAllByText('...');
      expect(ellipses).toHaveLength(1);

      expect(screen.queryByText('7')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('renders with exactly 2 pages on first page', () => {
      render(<PaginationNav currentPage={1} totalPages={2} buildHref={buildHref} />);
      const previous = screen.getByLabelText('Previous page');
      const next = screen.getByLabelText('Next page');
      expect(previous.tagName).toBe('SPAN');
      expect(previous.className).toContain('cursor-not-allowed');
      expect(next.tagName).toBe('A');
      expect(next).toHaveAttribute('href', '/test?page=2');

      // Both page numbers shown
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders with exactly 2 pages on last page', () => {
      render(<PaginationNav currentPage={2} totalPages={2} buildHref={buildHref} />);
      const previous = screen.getByLabelText('Previous page');
      const next = screen.getByLabelText('Next page');
      expect(previous.tagName).toBe('A');
      expect(previous).toHaveAttribute('href', '/test?page=1');
      expect(next.tagName).toBe('SPAN');
      expect(next.className).toContain('cursor-not-allowed');
    });

    it('handles very large page numbers with truncation', () => {
      render(<PaginationNav currentPage={500000} totalPages={999999} buildHref={buildHref} />);
      const previous = screen.getByLabelText('Previous page');
      const next = screen.getByLabelText('Next page');
      expect(previous.tagName).toBe('A');
      expect(next.tagName).toBe('A');
      expect(previous).toHaveAttribute('href', '/test?page=499999');
      expect(next).toHaveAttribute('href', '/test?page=500001');

      // First and last pages always shown
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('999999')).toBeInTheDocument();

      // Current page shown
      expect(screen.getByText('500000')).toBeInTheDocument();
    });
  });

  describe('buildHref patterns used in production', () => {
    it('generates correct hrefs with locale prefix', () => {
      const localeBuildHref = (p: number) => {
        const qs = p > 1 ? `?page=${p}` : '';
        return `/ja/posts/tips${qs}`;
      };
      render(<PaginationNav currentPage={2} totalPages={5} buildHref={localeBuildHref} />);
      const previous = screen.getByLabelText('Previous page');
      const next = screen.getByLabelText('Next page');
      expect(previous).toHaveAttribute('href', '/ja/posts/tips');
      expect(next).toHaveAttribute('href', '/ja/posts/tips?page=3');
    });

    it('generates correct hrefs with sort and page params on square pages', () => {
      const sortBuildHref = (p: number) => {
        const params = new URLSearchParams();
        params.set('sort', 'top');
        if (p > 1) params.set('page', String(p));
        const qs = params.toString();
        return `/en/topics/squares/e4?${qs}`;
      };
      render(<PaginationNav currentPage={3} totalPages={10} buildHref={sortBuildHref} />);
      const previous = screen.getByLabelText('Previous page');
      const next = screen.getByLabelText('Next page');
      expect(previous).toHaveAttribute('href', '/en/topics/squares/e4?sort=top&page=2');
      expect(next).toHaveAttribute('href', '/en/topics/squares/e4?sort=top&page=4');
    });

    it('generates correct hrefs for page 1 with sort (page param omitted)', () => {
      const sortBuildHref = (p: number) => {
        const params = new URLSearchParams();
        params.set('sort', 'top');
        if (p > 1) params.set('page', String(p));
        const qs = params.toString();
        return `/en/topics/squares/e4?${qs}`;
      };
      render(<PaginationNav currentPage={2} totalPages={5} buildHref={sortBuildHref} />);
      const previous = screen.getByLabelText('Previous page');
      // Going back to page 1: page param should be omitted, only sort remains
      expect(previous).toHaveAttribute('href', '/en/topics/squares/e4?sort=top');
    });

    it('generates correct hrefs for page number links', () => {
      const customBuildHref = (p: number) => `/custom?p=${p}&filter=active`;
      render(<PaginationNav currentPage={1} totalPages={3} buildHref={customBuildHref} />);

      // Page 2 link uses buildHref
      const page2 = screen.getByText('2');
      expect(page2).toHaveAttribute('href', '/custom?p=2&filter=active');

      // Page 3 link uses buildHref
      const page3 = screen.getByText('3');
      expect(page3).toHaveAttribute('href', '/custom?p=3&filter=active');
    });
  });

  describe('truncation boundary at 6 pages (smallest truncated set)', () => {
    it('shows trailing ellipsis only when on page 3 of 6 (middle)', () => {
      render(<PaginationNav currentPage={3} totalPages={6} buildHref={buildHref} />);

      // surroundingPageCount=1: rangeStart=max(2,2)=2, rangeEnd=min(5,4)=4
      // rangeStart=2 => no leading ellipsis (2 <= 2)
      // rangeEnd=4 < 5 => trailing ellipsis
      // Should show: 1 2 3 4 ... 6
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();

      const ellipses = screen.getAllByText('...');
      expect(ellipses).toHaveLength(1);

      expect(screen.queryByText('5')).not.toBeInTheDocument();
    });

    it('shows trailing ellipsis only when on page 1 of 6', () => {
      render(<PaginationNav currentPage={1} totalPages={6} buildHref={buildHref} />);

      // rangeStart=max(2,0)=2, rangeEnd=min(5,2)=2
      // Should show: 1 2 ... 6
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();

      const ellipses = screen.getAllByText('...');
      expect(ellipses).toHaveLength(1);

      expect(screen.queryByText('3')).not.toBeInTheDocument();
      expect(screen.queryByText('4')).not.toBeInTheDocument();
      expect(screen.queryByText('5')).not.toBeInTheDocument();
    });

    it('shows leading ellipsis only when on page 6 of 6', () => {
      render(<PaginationNav currentPage={6} totalPages={6} buildHref={buildHref} />);

      // rangeStart=max(2,5)=5, rangeEnd=min(5,7)=5
      // Should show: 1 ... 5 6
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();

      const ellipses = screen.getAllByText('...');
      expect(ellipses).toHaveLength(1);

      expect(screen.queryByText('2')).not.toBeInTheDocument();
      expect(screen.queryByText('3')).not.toBeInTheDocument();
      expect(screen.queryByText('4')).not.toBeInTheDocument();
    });

    it('shows leading ellipsis only when on page 4 of 6', () => {
      render(<PaginationNav currentPage={4} totalPages={6} buildHref={buildHref} />);

      // rangeStart=max(2,3)=3, rangeEnd=min(5,5)=5
      // rangeStart=3 > 2 => leading ellipsis
      // rangeEnd=5 = totalPages-1=5 => no trailing ellipsis
      // Should show: 1 ... 3 4 5 6
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();

      const ellipses = screen.getAllByText('...');
      expect(ellipses).toHaveLength(1);

      expect(screen.queryByText('2')).not.toBeInTheDocument();
    });
  });

  describe('ellipsis elements', () => {
    it('ellipsis elements are spans, not links', () => {
      render(<PaginationNav currentPage={5} totalPages={10} buildHref={buildHref} />);

      const ellipses = screen.getAllByText('...');
      for (const ellipsis of ellipses) {
        expect(ellipsis.tagName).toBe('SPAN');
        expect(ellipsis).not.toHaveAttribute('href');
      }
    });
  });

  describe('aria-current attribute exclusivity', () => {
    it('only the current page has aria-current="page"', () => {
      render(<PaginationNav currentPage={3} totalPages={5} buildHref={buildHref} />);

      // Page 3 should have aria-current
      const page3 = screen.getByText('3');
      expect(page3).toHaveAttribute('aria-current', 'page');

      // Other pages should NOT have aria-current
      for (const num of [1, 2, 4, 5]) {
        const el = screen.getByText(String(num));
        expect(el).not.toHaveAttribute('aria-current');
      }
    });

    it('only the current page has aria-current with truncation', () => {
      render(<PaginationNav currentPage={5} totalPages={10} buildHref={buildHref} />);

      const page5 = screen.getByText('5');
      expect(page5).toHaveAttribute('aria-current', 'page');

      // Check all visible page numbers except current
      for (const num of [1, 4, 6, 10]) {
        const el = screen.getByText(String(num));
        expect(el).not.toHaveAttribute('aria-current');
      }
    });
  });

  describe('boundary: totalPages=5 (last non-truncated case)', () => {
    it('shows all pages when on first page (currentPage=1)', () => {
      render(<PaginationNav currentPage={1} totalPages={5} buildHref={buildHref} />);
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByText(String(i))).toBeInTheDocument();
      }
      expect(screen.queryByText('...')).not.toBeInTheDocument();

      // Page 1 is current (span), others are links
      expect(screen.getByText('1').tagName).toBe('SPAN');
      expect(screen.getByText('1')).toHaveAttribute('aria-current', 'page');
      for (const num of [2, 3, 4, 5]) {
        expect(screen.getByText(String(num)).tagName).toBe('A');
      }
    });

    it('shows all pages when on last page (currentPage=5)', () => {
      render(<PaginationNav currentPage={5} totalPages={5} buildHref={buildHref} />);
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByText(String(i))).toBeInTheDocument();
      }
      expect(screen.queryByText('...')).not.toBeInTheDocument();

      // Page 5 is current (span), others are links
      expect(screen.getByText('5').tagName).toBe('SPAN');
      expect(screen.getByText('5')).toHaveAttribute('aria-current', 'page');
      for (const num of [1, 2, 3, 4]) {
        expect(screen.getByText(String(num)).tagName).toBe('A');
      }
    });
  });

  describe('boundary: totalPages=6 near start and end', () => {
    it('shows correct pages when on page 2 of 6 (near start)', () => {
      render(<PaginationNav currentPage={2} totalPages={6} buildHref={buildHref} />);

      // surroundingPageCount=1: rangeStart=max(2,1)=2, rangeEnd=min(5,3)=3
      // No leading ellipsis (rangeStart=2), trailing ellipsis (rangeEnd=3<5)
      // Should show: 1 2 3 ... 6
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();

      const ellipses = screen.getAllByText('...');
      expect(ellipses).toHaveLength(1);

      expect(screen.queryByText('4')).not.toBeInTheDocument();
      expect(screen.queryByText('5')).not.toBeInTheDocument();
    });

    it('shows correct pages when on page 5 of 6 (near end)', () => {
      render(<PaginationNav currentPage={5} totalPages={6} buildHref={buildHref} />);

      // surroundingPageCount=1: rangeStart=max(2,4)=4, rangeEnd=min(5,6)=5
      // Leading ellipsis (rangeStart=4>2), no trailing ellipsis (rangeEnd=5=totalPages-1)
      // Should show: 1 ... 4 5 6
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();

      const ellipses = screen.getAllByText('...');
      expect(ellipses).toHaveLength(1);

      expect(screen.queryByText('2')).not.toBeInTheDocument();
      expect(screen.queryByText('3')).not.toBeInTheDocument();
    });
  });

  describe('data-pagination-item attributes', () => {
    it('marks active Previous link with data-pagination-item="link"', () => {
      render(<PaginationNav currentPage={2} totalPages={3} buildHref={buildHref} />);
      const previous = screen.getByLabelText('Previous page');
      expect(previous).toHaveAttribute('data-pagination-item', 'link');
    });

    it('marks disabled Previous span with data-pagination-item="disabled"', () => {
      render(<PaginationNav currentPage={1} totalPages={3} buildHref={buildHref} />);
      const previous = screen.getByLabelText('Previous page');
      expect(previous).toHaveAttribute('data-pagination-item', 'disabled');
    });

    it('marks active Next link with data-pagination-item="link"', () => {
      render(<PaginationNav currentPage={1} totalPages={3} buildHref={buildHref} />);
      const next = screen.getByLabelText('Next page');
      expect(next).toHaveAttribute('data-pagination-item', 'link');
    });

    it('marks disabled Next span with data-pagination-item="disabled"', () => {
      render(<PaginationNav currentPage={3} totalPages={3} buildHref={buildHref} />);
      const next = screen.getByLabelText('Next page');
      expect(next).toHaveAttribute('data-pagination-item', 'disabled');
    });

    it('marks current page span with data-pagination-item="current"', () => {
      render(<PaginationNav currentPage={2} totalPages={3} buildHref={buildHref} />);
      const currentPageEl = screen.getByText('2');
      expect(currentPageEl).toHaveAttribute('data-pagination-item', 'current');
    });

    it('marks non-current page links with data-pagination-item="link"', () => {
      render(<PaginationNav currentPage={2} totalPages={3} buildHref={buildHref} />);
      const page1 = screen.getByText('1');
      const page3 = screen.getByText('3');
      expect(page1).toHaveAttribute('data-pagination-item', 'link');
      expect(page3).toHaveAttribute('data-pagination-item', 'link');
    });

    it('marks ellipsis spans with data-pagination-item="ellipsis"', () => {
      render(<PaginationNav currentPage={5} totalPages={10} buildHref={buildHref} />);
      const ellipses = screen.getAllByText('...');
      expect(ellipses).toHaveLength(2);
      for (const ellipsis of ellipses) {
        expect(ellipsis).toHaveAttribute('data-pagination-item', 'ellipsis');
      }
    });

    it('every element inside nav has a data-pagination-item attribute', () => {
      const { container } = render(
        <PaginationNav currentPage={5} totalPages={10} buildHref={buildHref} />
      );
      const nav = container.querySelector('nav')!;
      const directChildren = Array.from(nav.children);
      // Every direct child of the nav should have data-pagination-item
      for (const child of directChildren) {
        expect(child).toHaveAttribute('data-pagination-item');
      }
    });
  });

  describe('max displayed items count', () => {
    it('never shows more than 7 items in the page number area (for mobile fit)', () => {
      // The maximum items occur when both ellipses are shown:
      // 1 ... (current-1) current (current+1) ... last = 7 items
      // Test across various page counts and positions
      const testCases = [
        { currentPage: 1, totalPages: 6 },
        { currentPage: 6, totalPages: 6 },
        { currentPage: 5, totalPages: 10 },
        { currentPage: 50, totalPages: 100 },
        { currentPage: 1, totalPages: 100 },
        { currentPage: 100, totalPages: 100 },
        { currentPage: 3, totalPages: 7 },
      ];

      for (const { currentPage, totalPages } of testCases) {
        const { container, unmount } = render(
          <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
        );

        // Count page number items (spans and links inside nav, excluding Previous/Next)
        const nav = container.querySelector('nav')!;
        const allChildren = Array.from(nav.children);
        // Exclude first (Previous) and last (Next) elements
        const pageItems = allChildren.slice(1, -1);

        expect(pageItems.length).toBeLessThanOrEqual(7);

        unmount();
      }
    });
  });
});
