export const DEFAULT_PAGE_SIZE = 20;

export function getPaginationData(page: number, totalCount: number, pageSize = DEFAULT_PAGE_SIZE) {
  const currentPage = Math.max(1, page);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const limit = pageSize;
  const offset = (currentPage - 1) * pageSize;

  return {
    currentPage,
    totalPages,
    limit,
    offset,
  };
}
