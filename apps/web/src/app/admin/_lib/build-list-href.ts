/**
 * Build the `buildHref` callback for AdminPaginationNav: page number plus
 * the currently-applied filters, empty/undefined filters omitted.
 * Centralizes the URLSearchParams block previously copied into every
 * filtered admin list page.
 */
export function buildAdminListHref(
  basePath: string,
  filters: Record<string, string | null | undefined> = {}
): (page: number) => string {
  return (page) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    return `${basePath}?${params.toString()}`;
  };
}
