import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PositionAuthorHeader } from './PositionAuthorHeader';

vi.mock('@/i18n/routing', () => ({
  Link: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    locale?: string;
    className?: string;
  }) => (
    <a href={href} className={className} data-testid="link">
      {children}
    </a>
  ),
  useRouter: () => ({ push: () => {} }),
}));

const BASE_PROPS = {
  profile: { username: 'alice', avatarUrl: null },
  displayName: 'Alice',
  createdByLabel: 'Created by',
  locale: 'en' as const,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

describe('PositionAuthorHeader', () => {
  it('renders no edited label when edited is false', () => {
    render(<PositionAuthorHeader {...BASE_PROPS} edited={false} editedLabel="(edited)" />);
    expect(screen.queryByText('(edited)')).not.toBeInTheDocument();
  });

  it('renders the edited label as plain text when no editedHref is given (legacy edits)', () => {
    render(<PositionAuthorHeader {...BASE_PROPS} edited editedLabel="(edited)" />);
    const label = screen.getByText('(edited)');
    expect(label.tagName).toBe('SPAN');
  });

  it('renders the edited label as a link to the history page when editedHref is given', () => {
    render(
      <PositionAuthorHeader
        {...BASE_PROPS}
        edited
        editedLabel="(edited)"
        editedHref="/en/practice/puzzle/abc/history"
      />
    );
    const link = screen.getByRole('link', { name: '(edited)' });
    expect(link).toHaveAttribute('href', '/en/practice/puzzle/abc/history');
  });
});
