import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PaginationNav } from './PaginationNav';

// NOTE: this only tests the wiring (explicit locale passed through, keys
// mapped onto the view's labels). It deliberately does NOT prove that
// production SSR renders localised strings — getTranslations is mocked, so
// locale-resolution bugs (missing setRequestLocale etc.) are invisible here.
// The real check is the rendered SSR HTML of a localised page.
const getTranslations = vi.hoisted(() =>
  vi.fn(
    async ({ namespace }: { locale: string; namespace: string }) =>
      (key: string) =>
        `${namespace}.${key}`
  )
);

vi.mock('next-intl/server', () => ({ getTranslations }));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const buildHref = (page: number) => `/test?page=${page}`;

describe('PaginationNav (server wrapper)', () => {
  it('resolves Common.pagination with the explicit locale and feeds the view', async () => {
    render(await PaginationNav({ currentPage: 2, totalPages: 3, buildHref, locale: 'ja' }));

    expect(getTranslations).toHaveBeenCalledWith({ locale: 'ja', namespace: 'Common.pagination' });

    expect(
      screen.getByRole('navigation', { name: 'Common.pagination.navLabel' })
    ).toBeInTheDocument();
    const previous = screen.getByLabelText('Common.pagination.previousPage');
    const next = screen.getByLabelText('Common.pagination.nextPage');
    expect(previous).toHaveTextContent('Common.pagination.previous');
    expect(previous).toHaveAttribute('href', '/test?page=1');
    expect(next).toHaveTextContent('Common.pagination.next');
    expect(next).toHaveAttribute('href', '/test?page=3');
  });
});
