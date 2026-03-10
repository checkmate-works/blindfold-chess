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

  it('displays page info', () => {
    render(<PaginationNav currentPage={2} totalPages={5} buildHref={buildHref} />);
    expect(screen.getByText('Page 2 / 5')).toBeInTheDocument();
  });

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

  it('has a nav element with aria-label', () => {
    render(<PaginationNav currentPage={1} totalPages={2} buildHref={buildHref} />);
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  });

  it('uses the buildHref function correctly', () => {
    const customBuildHref = (page: number) => `/custom?p=${page}&filter=active`;
    render(<PaginationNav currentPage={1} totalPages={2} buildHref={customBuildHref} />);
    const next = screen.getByText('Next');
    expect(next).toHaveAttribute('href', '/custom?p=2&filter=active');
  });

  describe('edge cases', () => {
    it('renders nothing when totalPages is negative', () => {
      const { container } = render(
        <PaginationNav currentPage={1} totalPages={-1} buildHref={buildHref} />
      );
      expect(container.innerHTML).toBe('');
    });

    it('handles very large page numbers', () => {
      render(<PaginationNav currentPage={500000} totalPages={999999} buildHref={buildHref} />);
      expect(screen.getByText('Page 500000 / 999999')).toBeInTheDocument();
      const previous = screen.getByText('Previous');
      const next = screen.getByText('Next');
      expect(previous.tagName).toBe('A');
      expect(next.tagName).toBe('A');
      expect(previous).toHaveAttribute('href', '/test?page=499999');
      expect(next).toHaveAttribute('href', '/test?page=500001');
    });

    it('disables both buttons when on the only page of a 2-page set at last page', () => {
      render(<PaginationNav currentPage={2} totalPages={2} buildHref={buildHref} />);
      const previous = screen.getByText('Previous');
      const next = screen.getByText('Next');
      expect(previous.tagName).toBe('A');
      expect(previous).toHaveAttribute('href', '/test?page=1');
      expect(next.tagName).toBe('SPAN');
      expect(next.className).toContain('cursor-not-allowed');
    });

    it('disables Next and enables Previous on last page of a large set', () => {
      render(<PaginationNav currentPage={999999} totalPages={999999} buildHref={buildHref} />);
      const previous = screen.getByText('Previous');
      const next = screen.getByText('Next');
      expect(previous.tagName).toBe('A');
      expect(previous).toHaveAttribute('href', '/test?page=999998');
      expect(next.tagName).toBe('SPAN');
      expect(next.className).toContain('cursor-not-allowed');
    });

    it('renders with currentPage=0 (out-of-bounds low)', () => {
      render(<PaginationNav currentPage={0} totalPages={5} buildHref={buildHref} />);
      expect(screen.getByText('Page 0 / 5')).toBeInTheDocument();
      const previous = screen.getByText('Previous');
      const next = screen.getByText('Next');
      // currentPage (0) is not > 1, so Previous is disabled
      expect(previous.tagName).toBe('SPAN');
      // currentPage (0) < totalPages (5), so Next is enabled
      expect(next.tagName).toBe('A');
      expect(next).toHaveAttribute('href', '/test?page=1');
    });

    it('renders with negative currentPage', () => {
      render(<PaginationNav currentPage={-1} totalPages={5} buildHref={buildHref} />);
      expect(screen.getByText('Page -1 / 5')).toBeInTheDocument();
      const previous = screen.getByText('Previous');
      const next = screen.getByText('Next');
      // currentPage (-1) is not > 1, so Previous is disabled
      expect(previous.tagName).toBe('SPAN');
      // currentPage (-1) < totalPages (5), so Next is enabled
      expect(next.tagName).toBe('A');
      expect(next).toHaveAttribute('href', '/test?page=0');
    });

    it('renders with currentPage exceeding totalPages', () => {
      render(<PaginationNav currentPage={10} totalPages={5} buildHref={buildHref} />);
      expect(screen.getByText('Page 10 / 5')).toBeInTheDocument();
      const previous = screen.getByText('Previous');
      const next = screen.getByText('Next');
      // currentPage (10) > 1, so Previous is enabled
      expect(previous.tagName).toBe('A');
      expect(previous).toHaveAttribute('href', '/test?page=9');
      // currentPage (10) is not < totalPages (5), so Next is disabled
      expect(next.tagName).toBe('SPAN');
      expect(next.className).toContain('cursor-not-allowed');
    });

    it('renders with exactly 2 pages on first page', () => {
      render(<PaginationNav currentPage={1} totalPages={2} buildHref={buildHref} />);
      const previous = screen.getByText('Previous');
      const next = screen.getByText('Next');
      expect(previous.tagName).toBe('SPAN');
      expect(previous.className).toContain('cursor-not-allowed');
      expect(next.tagName).toBe('A');
      expect(next).toHaveAttribute('href', '/test?page=2');
    });

    it('handles fractional currentPage', () => {
      render(<PaginationNav currentPage={2.5} totalPages={5} buildHref={buildHref} />);
      expect(screen.getByText('Page 2.5 / 5')).toBeInTheDocument();
      const previous = screen.getByText('Previous');
      const next = screen.getByText('Next');
      // 2.5 > 1, so Previous is enabled
      expect(previous.tagName).toBe('A');
      expect(previous).toHaveAttribute('href', '/test?page=1.5');
      // 2.5 < 5, so Next is enabled
      expect(next.tagName).toBe('A');
      expect(next).toHaveAttribute('href', '/test?page=3.5');
    });

    it('renders with currentPage equal to totalPages (both > 1)', () => {
      render(<PaginationNav currentPage={5} totalPages={5} buildHref={buildHref} />);
      expect(screen.getByText('Page 5 / 5')).toBeInTheDocument();
      const previous = screen.getByText('Previous');
      const next = screen.getByText('Next');
      // On last page: Previous enabled, Next disabled
      expect(previous.tagName).toBe('A');
      expect(previous).toHaveAttribute('href', '/test?page=4');
      expect(next.tagName).toBe('SPAN');
      expect(next.className).toContain('cursor-not-allowed');
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

    it('generates correct hrefs with locale prefix for page 1 (no query string)', () => {
      const localeBuildHref = (p: number) => {
        const qs = p > 1 ? `?page=${p}` : '';
        return `/ja/posts/tips${qs}`;
      };
      render(<PaginationNav currentPage={1} totalPages={3} buildHref={localeBuildHref} />);
      const next = screen.getByText('Next');
      expect(next).toHaveAttribute('href', '/ja/posts/tips?page=2');
    });
  });
});
