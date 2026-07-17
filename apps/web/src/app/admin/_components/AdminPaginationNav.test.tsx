import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminPaginationNav } from './AdminPaginationNav';

// Mock the barrel import to avoid pulling in transitive deps.
// We only need PaginationNavView, which we mock to inspect forwarded props.
vi.mock('@/app/[locale]/_components', () => ({
  PaginationNavView: ({
    currentPage,
    totalPages,
    buildHref,
    labels,
  }: {
    currentPage: number;
    totalPages: number;
    buildHref: (page: number) => string;
    labels: { navLabel: string; previous: string; next: string };
  }) => (
    <nav
      aria-label={labels.navLabel}
      data-testid="pagination-nav"
      data-current-page={currentPage}
      data-total-pages={totalPages}
      data-href-sample={buildHref(1)}
      data-labels={`${labels.previous}/${labels.next}`}
    />
  ),
}));

const buildHref = (page: number) => `/admin/test?page=${page}`;

describe('AdminPaginationNav', () => {
  it('renders PaginationNav inside a wrapper div', () => {
    render(<AdminPaginationNav currentPage={2} totalPages={5} buildHref={buildHref} />);
    const nav = screen.getByTestId('pagination-nav');
    expect(nav).toBeInTheDocument();
    const wrapper = nav.parentElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper!.tagName).toBe('DIV');
  });

  it('applies bg-card and hover Tailwind classes to the wrapper div', () => {
    render(<AdminPaginationNav currentPage={2} totalPages={5} buildHref={buildHref} />);
    const nav = screen.getByTestId('pagination-nav');
    const wrapper = nav.parentElement!;
    expect(wrapper.className).toContain('[&_[data-pagination-item=link]]:bg-card');
    expect(wrapper.className).toContain('[&_[data-pagination-item=disabled]]:bg-card');
    expect(wrapper.className).toContain('[&_[data-pagination-item=link]:hover]:bg-secondary');
  });

  it('forwards currentPage to PaginationNav', () => {
    render(<AdminPaginationNav currentPage={3} totalPages={10} buildHref={buildHref} />);
    const nav = screen.getByTestId('pagination-nav');
    expect(nav).toHaveAttribute('data-current-page', '3');
  });

  it('forwards totalPages to PaginationNav', () => {
    render(<AdminPaginationNav currentPage={1} totalPages={7} buildHref={buildHref} />);
    const nav = screen.getByTestId('pagination-nav');
    expect(nav).toHaveAttribute('data-total-pages', '7');
  });

  it('forwards buildHref to PaginationNav', () => {
    render(<AdminPaginationNav currentPage={1} totalPages={5} buildHref={buildHref} />);
    const nav = screen.getByTestId('pagination-nav');
    // The mock calls buildHref(1) and renders the result
    expect(nav).toHaveAttribute('data-href-sample', '/admin/test?page=1');
  });
});
