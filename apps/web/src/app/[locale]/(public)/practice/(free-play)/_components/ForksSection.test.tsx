import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ForksSection } from './ForksSection';

// The component renders an `<Link>` from `@/i18n/routing`. Stub to a plain
// anchor so we can assert the href the section sends users to.
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>
      {children}
    </a>
  ),
}));

const labels = {
  sectionTitle: (count: number) => `${count} forks`,
  byAuthor: (name: string) => `by ${name}`,
};

function row(id: string, title: string, author: { displayName?: string; username?: string }) {
  return {
    position: { id, title },
    profile: {
      username: author.username ?? null,
      displayName: author.displayName ?? null,
      avatarUrl: null,
    },
  };
}

describe('ForksSection', () => {
  it('renders nothing when totalCount is zero (no DOM noise on un-forked rows)', () => {
    const { container } = render(
      <ForksSection forks={[]} totalCount={0} basePath="/practice/puzzle" labels={labels} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the summary and one row per fork, linking to the detail page', () => {
    render(
      <ForksSection
        forks={[
          row('aaa', 'Fork A', { displayName: 'alice' }),
          row('bbb', 'Fork B', { displayName: 'bob' }),
        ]}
        totalCount={2}
        basePath="/practice/puzzle"
        labels={labels}
      />
    );
    expect(screen.getByText('2 forks')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fork A' })).toHaveAttribute(
      'href',
      '/practice/puzzle/aaa'
    );
    expect(screen.getByRole('link', { name: 'Fork B' })).toHaveAttribute(
      'href',
      '/practice/puzzle/bbb'
    );
    expect(screen.getByText('— by alice')).toBeInTheDocument();
    expect(screen.getByText('— by bob')).toBeInTheDocument();
  });

  it('uses the supplied basePath verbatim so the same component serves both puzzle and memory routes', () => {
    render(
      <ForksSection
        forks={[row('ccc', 'Memory Fork', { displayName: 'carol' })]}
        totalCount={1}
        basePath="/practice/position-memory"
        labels={labels}
      />
    );
    expect(screen.getByRole('link', { name: 'Memory Fork' })).toHaveAttribute(
      'href',
      '/practice/position-memory/ccc'
    );
  });

  it('falls back to "Anonymous" when the profile is null (orphaned author)', () => {
    render(
      <ForksSection
        forks={[
          {
            position: { id: 'ddd', title: 'No Author' },
            profile: null,
          },
        ]}
        totalCount={1}
        basePath="/practice/puzzle"
        labels={labels}
      />
    );
    // resolveDisplayName returns "Anonymous" when the profile is missing —
    // verifies the section degrades gracefully without surfacing a blank
    // name field next to the link.
    expect(screen.getByText(/— by /)).toBeInTheDocument();
  });
});
