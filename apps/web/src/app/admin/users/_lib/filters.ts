/**
 * Admin users page filter types and URL-building helpers.
 *
 * All four filters are grouped into a single `AdminUserFilters` object so
 * they can be passed around as a unit instead of threading 4 separate
 * props through every sub-component.
 */
export type AdminUserFilters = {
  statusFilter: string;
  countryFilter: string;
  rankFilter: string;
  providerFilter: string;
  usernameFilter: string;
};

/**
 * The "no filter applied" baseline. Useful as the default in tests and
 * anywhere a single filter override needs to be expressed (`{ ...EMPTY_ADMIN_USER_FILTERS, statusFilter: 'banned' }`).
 */
export const EMPTY_ADMIN_USER_FILTERS: AdminUserFilters = {
  statusFilter: '',
  countryFilter: '',
  rankFilter: '',
  providerFilter: '',
  usernameFilter: '',
};

/**
 * Build the `/admin/users?...` URL for a given filter set and page number.
 * Empty filter values are omitted from the resulting query string so the
 * URL stays clean.
 */
export function buildAdminUsersHref(filters: AdminUserFilters, page: number): string {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('tab', 'list');
  if (filters.statusFilter) params.set('status', filters.statusFilter);
  if (filters.countryFilter) params.set('country', filters.countryFilter);
  if (filters.rankFilter) params.set('rank', filters.rankFilter);
  if (filters.providerFilter) params.set('provider', filters.providerFilter);
  if (filters.usernameFilter) params.set('username', filters.usernameFilter);
  return `/admin/users?${params.toString()}`;
}
