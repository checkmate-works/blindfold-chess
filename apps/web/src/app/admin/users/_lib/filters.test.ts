import { describe, expect, it } from 'vitest';

import { type AdminUserFilters, buildAdminUsersHref } from './filters';

function makeFilters(overrides: Partial<AdminUserFilters> = {}): AdminUserFilters {
  return {
    statusFilter: '',
    countryFilter: '',
    rankFilter: '',
    providerFilter: '',
    usernameFilter: '',
    ...overrides,
  };
}

describe('buildAdminUsersHref', () => {
  it('always sets page and tab=list', () => {
    const href = buildAdminUsersHref(makeFilters(), 1);
    expect(href).toBe('/admin/users?page=1&tab=list');
  });

  it('omits empty filter values from the query string', () => {
    const href = buildAdminUsersHref(makeFilters(), 3);
    expect(href).not.toContain('status=');
    expect(href).not.toContain('country=');
    expect(href).not.toContain('rank=');
    expect(href).not.toContain('provider=');
    expect(href).not.toContain('username=');
  });

  it('includes non-empty username filter', () => {
    const href = buildAdminUsersHref(makeFilters({ usernameFilter: 'alice' }), 1);
    expect(href).toBe('/admin/users?page=1&tab=list&username=alice');
  });

  it('includes non-empty status filter', () => {
    const href = buildAdminUsersHref(makeFilters({ statusFilter: 'banned' }), 2);
    expect(href).toBe('/admin/users?page=2&tab=list&status=banned');
  });

  it('includes non-empty country filter', () => {
    const href = buildAdminUsersHref(makeFilters({ countryFilter: 'JP' }), 1);
    expect(href).toBe('/admin/users?page=1&tab=list&country=JP');
  });

  it('includes non-empty rank filter', () => {
    const href = buildAdminUsersHref(makeFilters({ rankFilter: 'shodan' }), 1);
    expect(href).toBe('/admin/users?page=1&tab=list&rank=shodan');
  });

  it('includes non-empty provider filter', () => {
    const href = buildAdminUsersHref(makeFilters({ providerFilter: 'google' }), 1);
    expect(href).toBe('/admin/users?page=1&tab=list&provider=google');
  });

  it('combines all filters when present', () => {
    const href = buildAdminUsersHref(
      makeFilters({
        statusFilter: 'active',
        countryFilter: 'US',
        rankFilter: 'ikkyu',
        providerFilter: 'email',
      }),
      5
    );
    expect(href).toContain('page=5');
    expect(href).toContain('tab=list');
    expect(href).toContain('status=active');
    expect(href).toContain('country=US');
    expect(href).toContain('rank=ikkyu');
    expect(href).toContain('provider=email');
  });

  it('mixes empty and non-empty filters correctly', () => {
    const href = buildAdminUsersHref(
      makeFilters({ statusFilter: 'banned', rankFilter: 'shodan' }),
      2
    );
    expect(href).toBe('/admin/users?page=2&tab=list&status=banned&rank=shodan');
  });
});
