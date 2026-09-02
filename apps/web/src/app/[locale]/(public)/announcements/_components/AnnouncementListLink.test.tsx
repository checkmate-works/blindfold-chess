import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AnnouncementListItem } from '../_lib/queries';
import { AnnouncementListLink } from './AnnouncementListLink';

vi.mock('@/i18n/routing');

// The chip resolves its own label through `getTranslations`, which has no
// runtime outside a request. Stub it — what this file pins down is WHEN the
// row asks for a chip, not what the chip reads out.
vi.mock('./MembersOnlyBadge', () => ({
  MembersOnlyBadge: () => <span data-testid="members-only-badge">Members only</span>,
}));

function announcement(overrides: Partial<AnnouncementListItem> = {}): AnnouncementListItem {
  return {
    id: 'a1',
    slug: 'new-feature',
    title: 'New feature',
    locale: 'en',
    visibility: 'public',
    pinnedAt: null,
    publishedAt: '2026-01-02T03:04:05.000Z',
    ...overrides,
  };
}

describe('AnnouncementListLink', () => {
  /**
   * The chip follows the announcement's `visibility` and nothing else. The
   * two surfaces that list announcements each used to decide it for
   * themselves, and the landing page's copy also required `!userId` — so one
   * announcement was chipped in the list and bare on the dashboard for the
   * same signed-in reader. Note what the row is given: an announcement and a
   * locale. There is no viewer here to condition on, which is what keeps the
   * two surfaces from drifting apart again.
   */
  describe('members-only chip', () => {
    it('marks a members-only announcement', () => {
      render(
        <AnnouncementListLink
          announcement={announcement({ visibility: 'members_only' })}
          locale="en"
        />
      );

      expect(screen.getByTestId('members-only-badge')).toBeInTheDocument();
    });

    it('leaves a public announcement unmarked', () => {
      render(<AnnouncementListLink announcement={announcement()} locale="en" />);

      expect(screen.queryByTestId('members-only-badge')).not.toBeInTheDocument();
    });
  });

  it('links to the announcement and dates it in the given locale', () => {
    render(
      <AnnouncementListLink
        announcement={announcement({ pinnedAt: '2026-01-05T00:00:00.000Z' })}
        locale="en"
      />
    );

    const link = screen.getByRole('link', { name: /New feature/ });
    // The locale prefix is `Link`'s job, and `Link` is stubbed here as a
    // plain anchor, so the href is the unprefixed path the row builds.
    expect(link).toHaveAttribute('href', '/announcements/new-feature');
    expect(link).toHaveTextContent('📢');
    expect(link).toHaveTextContent(
      new Date('2026-01-02T03:04:05.000Z').toLocaleDateString('en', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    );
  });
});
