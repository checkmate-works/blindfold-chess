import Link from 'next/link';

import { AdminDataTable } from '@/app/admin/_components/AdminDataTable';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { db, positions } from '@/lib/db';
import { DEFAULT_PAGE_SIZE, getPaginationParams } from '@/lib/pagination';
import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';
import { truncate } from '@/lib/text';

import { PaginationNav } from '@/app/[locale]/_components';

import { DeletePositionButton } from './_components/DeletePositionButton';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

export default async function AdminPositionMemoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page } = await searchParamsCache.parse(searchParams);

  const whereMemoryActive = and(isNull(positions.deletedAt), eq(positions.type, 'memory'));

  // Count only non-deleted memory positions
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(positions)
    .where(whereMemoryActive);

  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    countResult?.count ?? 0,
    DEFAULT_PAGE_SIZE
  );

  // Fetch paginated positions
  const rows = await db
    .select()
    .from(positions)
    .where(whereMemoryActive)
    .orderBy(desc(positions.createdAt))
    .limit(limit)
    .offset(offset);

  const buildHref = (p: number) => `/admin/positions/memory?page=${p}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Position Memory</h1>
        <Link
          href="/admin/positions/memory/new"
          className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          New Position
        </Link>
      </div>

      {rows.length > 0 && (
        <p className="text-sm text-muted-foreground mb-2">
          Showing {(currentPage - 1) * DEFAULT_PAGE_SIZE + 1}&ndash;
          {(currentPage - 1) * DEFAULT_PAGE_SIZE + rows.length} of {countResult?.count ?? 0}{' '}
          positions
        </p>
      )}

      <AdminDataTable
        headers={['Title', 'Board', 'Description', 'Created At', 'Actions']}
        items={rows}
        emptyMessage="No positions found"
        renderRow={(position) => (
          <tr key={position.id} className="border-t border-border">
            <td className="px-4 py-3">
              <Link
                href={`/admin/positions/memory/${position.id}`}
                className="font-medium text-primary hover:underline"
              >
                {position.title}
              </Link>
            </td>
            <td className="px-4 py-3">
              <BoardThumbnail fen={position.fen} className="w-20 h-20" />
            </td>
            <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
              {position.description ? truncate(position.description) : '-'}
            </td>
            <td className="px-4 py-3 text-muted-foreground text-sm">
              {new Date(position.createdAt).toLocaleString()}
            </td>
            <td className="px-4 py-3">
              <DeletePositionButton id={position.id} title={position.title} />
            </td>
          </tr>
        )}
      />

      <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
