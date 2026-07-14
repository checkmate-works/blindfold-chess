import type { ComponentType, ReactNode } from 'react';

import Link from 'next/link';

import { AdminDataTable } from '@/app/admin/_components/AdminDataTable';
import { AdminListSummary } from '@/app/admin/_components/AdminListSummary';
import { AdminPageHeader } from '@/app/admin/_components/AdminPageHeader';
import { AdminPaginationNav } from '@/app/admin/_components/AdminPaginationNav';
import { adminPageSearchParamsCache } from '@/app/admin/_lib/admin-search-params';
import { buildAdminListHref } from '@/app/admin/_lib/build-list-href';
import { formatDateTime } from '@/app/admin/_lib/format';
import { FaExternalLinkAlt } from 'react-icons/fa';

import type { Position } from '@/lib/db';
import { DEFAULT_PAGE_SIZE, getPaginationParams } from '@/lib/pagination';
import { countPositions, listPositions } from '@/lib/positions/queries';
import type { PositionType } from '@/lib/positions/types';
import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';
import { truncate } from '@/lib/text';

type PositionsListPageProps = {
  /** Position type filter; also determines the admin base path `/admin/positions/{type}`. */
  type: PositionType;
  /** Breadcrumb / page title (e.g. 'Position Memory', 'Puzzle'). */
  title: string;
  /** Public detail path prefix (e.g. '/en/practice/position-memory'). */
  publicPathPrefix: string;
  /** Entity-specific delete button (delete action baked in). */
  DeleteButton: ComponentType<{ id: string; title: string }>;
  /**
   * Optional extra per-row action rendered before the delete button (e.g.
   * the puzzle list's Daily Puzzle featured toggle). Plain server-to-server
   * function prop — this page and its callers all render on the server.
   */
  renderRowAction?: (position: Position) => ReactNode;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Shared admin list page for position-based content (memory positions and
 * puzzles) — paginated table with board thumbnail, public link and delete.
 */
export async function PositionsListPage({
  type,
  title,
  publicPathPrefix,
  DeleteButton,
  renderRowAction,
  searchParams,
}: PositionsListPageProps) {
  const { page } = await adminPageSearchParamsCache.parse(searchParams);

  const totalCount = await countPositions({ type });

  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    DEFAULT_PAGE_SIZE
  );

  const rows = await listPositions({ type, limit, offset });

  const buildHref = buildAdminListHref(`/admin/positions/${type}`);

  return (
    <div>
      <AdminPageHeader breadcrumbs={[{ label: title }]} />

      <AdminListSummary
        currentPage={currentPage}
        pageSize={DEFAULT_PAGE_SIZE}
        shownCount={rows.length}
        totalCount={totalCount}
        itemLabel="positions"
      />

      <AdminDataTable
        headers={['Title', 'Board', 'Description', 'Created At', 'Actions']}
        items={rows}
        emptyMessage="No positions found"
        renderRow={(position) => (
          <tr key={position.id} className="border-t border-border">
            <td className="px-4 py-3">
              <Link
                href={`${publicPathPrefix}/${position.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <span className="font-medium">{position.title}</span>
                <FaExternalLinkAlt className="h-3 w-3" />
              </Link>
            </td>
            <td className="px-4 py-3">
              <BoardThumbnail fen={position.fen} className="w-20 h-20" />
            </td>
            <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
              {position.description ? truncate(position.description) : '-'}
            </td>
            <td className="px-4 py-3 text-muted-foreground text-sm">
              {formatDateTime(position.createdAt)}
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                {renderRowAction?.(position)}
                <DeleteButton id={position.id} title={position.title} />
              </div>
            </td>
          </tr>
        )}
      />

      <AdminPaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
