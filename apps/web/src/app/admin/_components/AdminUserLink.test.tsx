import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AdminUserLink } from './AdminUserLink';

afterEach(cleanup);

const USER_ID = '2f6b870a-5d40-48ae-9593-255001528a21';
const labels = {
  deletedLabel: '(deleted user)',
  provisionalLabel: '(registration incomplete)',
};

describe('AdminUserLink', () => {
  it('links a named user to their admin detail page', () => {
    render(<AdminUserLink userId={USER_ID} username="alice" {...labels} />);

    expect(screen.getByRole('link', { name: 'alice' })).toHaveAttribute(
      'href',
      `/admin/users/${USER_ID}`
    );
  });

  it('calls a profileless account provisional, not deleted, and keeps the link', () => {
    render(<AdminUserLink userId={USER_ID} username={null} {...labels} />);

    const link = screen.getByRole('link', { name: /registration incomplete/ });
    expect(link).toHaveAttribute('href', `/admin/users/${USER_ID}`);
    expect(link).toHaveAttribute('title', USER_ID);
    expect(screen.queryByText(/deleted user/)).toBeNull();
  });

  it('shortens the id it shows beside the provisional label', () => {
    render(<AdminUserLink userId={USER_ID} username={null} {...labels} />);

    expect(screen.getByText('(registration incomplete) (2f6b870a…)')).toBeTruthy();
    expect(screen.queryByText(USER_ID)).toBeNull();
  });

  it('calls the user deleted, with no link, once the account is known to be gone', () => {
    render(<AdminUserLink userId={USER_ID} username={null} accountExists={false} {...labels} />);

    expect(screen.getByText('(deleted user) (2f6b870a…)')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('calls a null id deleted, with no id to show', () => {
    render(<AdminUserLink userId={null} username={null} {...labels} />);

    expect(screen.getByText('(deleted user)')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
