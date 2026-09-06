import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { UserActivityLog } from '@/lib/db/schema';

import type { ActivityTargetLinkMap } from '../_lib/target-links';
import { ActivityLogRow } from './ActivityLogRow';

const ACTOR_ID = '11111111-1111-4111-8111-111111111111';
const TARGET_ID = '2f6b870a-5d40-48ae-9593-255001528a21';

function makeLog(overrides: Partial<UserActivityLog> = {}): UserActivityLog {
  return {
    id: 'log-1',
    userId: ACTOR_ID,
    action: 'like',
    targetType: 'position',
    targetId: TARGET_ID,
    metadata: {},
    createdAt: new Date('2026-09-06T00:00:00Z'),
    ...overrides,
  } as UserActivityLog;
}

function renderRow(log: UserActivityLog, targetLinks: ActivityTargetLinkMap = new Map()) {
  return render(
    <table>
      <tbody>
        <ActivityLogRow
          log={log}
          profileMap={new Map([[ACTOR_ID, { username: 'alice' }]])}
          deletedUserLabel="(deleted user)"
          targetLinks={targetLinks}
        />
      </tbody>
    </table>
  );
}

describe('ActivityLogRow target column', () => {
  it('links a resolved target out to the public page in a new tab', () => {
    renderRow(
      makeLog(),
      new Map([
        [`position:${TARGET_ID}`, { path: '/practice/puzzle/abc', label: 'Back rank mate' }],
      ])
    );

    const link = screen.getByRole('link', { name: /Back rank mate/ });
    expect(link).toHaveAttribute('href', '/en/practice/puzzle/abc');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('labels a target that has no name of its own with a shortened id', () => {
    renderRow(
      makeLog({ targetType: 'topic_post' }),
      new Map([[`topic_post:${TARGET_ID}`, { path: '/topics/squares/e4/posts/x', label: null }]])
    );

    expect(screen.getByRole('link', { name: /2f6b870a/ })).toBeInTheDocument();
    expect(screen.queryByText(TARGET_ID)).not.toBeInTheDocument();
  });

  it('falls back to the plain id when the target has no public page', () => {
    renderRow(makeLog());

    expect(screen.queryByRole('link', { name: /2f6b870a/ })).not.toBeInTheDocument();
    expect(screen.getByText(TARGET_ID)).toBeInTheDocument();
  });

  it('sends a user target to the admin detail page rather than the public profile', () => {
    renderRow(makeLog({ action: 'follow', targetType: 'user', targetId: ACTOR_ID }));

    const links = screen.getAllByRole('link', { name: 'alice' });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute('href', `/admin/users/${ACTOR_ID}`);
    }
  });
});
