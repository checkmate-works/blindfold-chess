import { getPaginationParams } from '@/lib/pagination';

export const DEFAULT_PAGE_SIZE = 20;

/**
 * @deprecated Use `getPaginationParams` from `@/lib/pagination` directly.
 */
export function getPaginationData(page: number, totalCount: number, pageSize = DEFAULT_PAGE_SIZE) {
  return getPaginationParams(page, totalCount, pageSize);
}
