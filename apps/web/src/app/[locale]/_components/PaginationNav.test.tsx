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
      const previous = screen.getByText('Previous');
      expect(previous.tagName).toBe('SPAN');
      expect(previous.className).toContain('cursor-not-allowed');
    });

    it('enables Previous on non-first page', () => {
      render(<PaginationNav currentPage={2} totalPages={3} buildHref={buildHref} />);
      const previous = screen.getByText('Previous');
      expect(previous.tagName).toBe('A');
      expect(previous).toHaveAttribute('href', '/test?page=1');
    });

    it('disables Next on last page', () => {
      render(<PaginationNav currentPage={3} totalPages={3} buildHref={buildHref} />);
      const next = screen.getByText('Next');
      expect(next.tagName).toBe('SPAN');
      expect(next.className).toContain('cursor-not-allowed');
    });

    it('enables Next on non-last page', () => {
      render(<PaginationNav currentPage={1} totalPages={3} buildHref={buildHref} />);
      const next = screen.getByText('Next');
      expect(next.tagName).toBe('A');
      expect(next).toHaveAttribute('href', '/test?page=2');
    });

    it('enables both Previous and Next on middle page', () => {
      render(<PaginationNav currentPage={2} totalPages={3} buildHref={buildHref} />);
      const previous = screen.getByText('Previous');
      const next = screen.getByText('Next');
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

    it('shows all pages when total is 7', () => {
      render(<PaginationNav currentPage={4} totalPages={7} buildHref={buildHref} />);
      for (let i = 1; i <= 7; i++) {
        expect(screen.getByText(String(i))).toBeInTheDocument();
      }
      expect(screen.queryByText('...')).not.toBeInTheDocument();
    });
  });

  describe('truncation with ellipsis', () => {
    it('shows ellipsis for large page counts when on first page', () => {
      render(<PaginationNav currentPage={1} totalPages={10} buildHref={buildHref} />);

      // Should show: 1 2 3 ... 10
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('...')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();

      // Should not show middle pages
      expect(screen.queryByText('5')).not.toBeInTheDocument();
      expect(screen.queryByText('6')).not.toBeInTheDocument();
    });

    it('shows ellipsis for large page counts when on last page', () => {
      render(<PaginationNav currentPage={10} totalPages={10} buildHref={buildHref} />);

      // Should show: 1 ... 8 9 10
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('...')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('9')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();

      expect(screen.queryByText('5')).not.toBeInTheDocument();
    });

    it('shows two ellipses when current page is in the middle of a large set', () => {
      render(<PaginationNav currentPage={5} totalPages={10} buildHref={buildHref} />);

      // Should show: 1 ... 3 4 5 6 7 ... 10
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();

      const ellipses = screen.getAllByText('...');
      expect(ellipses).toHaveLength(2);

      // Should not show pages outside the window
      expect(screen.queryByText('2')).not.toBeInTheDocument();
      expect(screen.queryByText('8')).not.toBeInTheDocument();
    });

    it('does not show leading ellipsis when window touches first page', () => {
      render(<PaginationNav currentPage={3} totalPages={10} buildHref={buildHref} />);

      // Should show: 1 2 3 4 5 ... 10
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();

      const ellipses = screen.getAllByText('...');
      expect(ellipses).toHaveLength(1);
    });

    it('does not show trailing ellipsis when window touches last page', () => {
      render(<PaginationNav currentPage={8} totalPages={10} buildHref={buildHref} />);

      // Should show: 1 ... 6 7 8 9 10
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('9')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();

      const ellipses = screen.getAllByText('...');
      expect(ellipses).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('renders with exactly 2 pages on first page', () => {
      render(<PaginationNav currentPage={1} totalPages={2} buildHref={buildHref} />);
      const previous = screen.getByText('Previous');
      const next = screen.getByText('Next');
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
      const previous = screen.getByText('Previous');
      const next = screen.getByText('Next');
      expect(previous.tagName).toBe('A');
      expect(previous).toHaveAttribute('href', '/test?page=1');
      expect(next.tagName).toBe('SPAN');
      expect(next.className).toContain('cursor-not-allowed');
    });

    it('handles very large page numbers with truncation', () => {
      render(<PaginationNav currentPage={500000} totalPages={999999} buildHref={buildHref} />);
      const previous = screen.getByText('Previous');
      const next = screen.getByText('Next');
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
      const previous = screen.getByText('Previous');
      const next = screen.getByText('Next');
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
      const previous = screen.getByText('Previous');
      const next = screen.getByText('Next');
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
      const previous = screen.getByText('Previous');
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

  describe('truncation boundary at 8 pages (smallest truncated set)', () => {
    it('shows all pages without ellipsis when on page 4 of 8 (window touches first)', () => {
      render(<PaginationNav currentPage={4} totalPages={8} buildHref={buildHref} />);

      // Window: currentPage-2=2 to currentPage+2=6, plus first(1) and last(8)
      // rangeStart=2, rangeEnd=6 => no leading ellipsis (rangeStart <= 2)
      // rangeEnd=6 < 7 (totalPages-1) => trailing ellipsis
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();

      const ellipses = screen.getAllByText('...');
      expect(ellipses).toHaveLength(1);
    });

    it('shows trailing ellipsis only when on page 1 of 8', () => {
      render(<PaginationNav currentPage={1} totalPages={8} buildHref={buildHref} />);

      // rangeStart=max(2, 1-2)=2, rangeEnd=min(7, 1+2)=3
      // Should show: 1 2 3 ... 8
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();

      const ellipses = screen.getAllByText('...');
      expect(ellipses).toHaveLength(1);

      // Pages 4-7 should not be shown
      expect(screen.queryByText('4')).not.toBeInTheDocument();
      expect(screen.queryByText('5')).not.toBeInTheDocument();
    });

    it('shows leading ellipsis only when on page 8 of 8', () => {
      render(<PaginationNav currentPage={8} totalPages={8} buildHref={buildHref} />);

      // rangeStart=max(2, 8-2)=6, rangeEnd=min(7, 8+2)=7
      // Should show: 1 ... 6 7 8
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();

      const ellipses = screen.getAllByText('...');
      expect(ellipses).toHaveLength(1);

      // Pages 2-5 should not be shown
      expect(screen.queryByText('2')).not.toBeInTheDocument();
      expect(screen.queryByText('3')).not.toBeInTheDocument();
    });

    it('shows two ellipses when on page 5 of 8', () => {
      render(<PaginationNav currentPage={5} totalPages={8} buildHref={buildHref} />);

      // rangeStart=max(2, 5-2)=3, rangeEnd=min(7, 5+2)=7
      // rangeStart=3 > 2 => leading ellipsis
      // rangeEnd=7 = totalPages-1=7 => no trailing ellipsis
      // Should show: 1 ... 3 4 5 6 7 8
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();

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
      for (const num of [1, 3, 4, 6, 7, 10]) {
        const el = screen.getByText(String(num));
        expect(el).not.toHaveAttribute('aria-current');
      }
    });
  });
});
