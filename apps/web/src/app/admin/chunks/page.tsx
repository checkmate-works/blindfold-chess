import Link from 'next/link';

import { AdminDataTable } from '@/app/admin/_components/AdminDataTable';
import { AdminPaginationNav } from '@/app/admin/_components/AdminPaginationNav';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { countChunks, listChunks } from '@/lib/chunks/queries';
import { DEFAULT_PAGE_SIZE, getPaginationParams } from '@/lib/pagination';
import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';
import { truncate } from '@/lib/text';

import { DeleteChunkButton } from './_components/DeleteChunkButton';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

export default async function AdminChunksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page } = await searchParamsCache.parse(searchParams);

  const totalCount = await countChunks({});

  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    DEFAULT_PAGE_SIZE
  );

  const rows = await listChunks({ limit, offset });

  const buildHref = (p: number) => `/admin/chunks?page=${p}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Chunks</h1>
        <Link
          href="/admin/chunks/new"
          className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          New Chunk
        </Link>
      </div>

      {rows.length > 0 && (
        <p className="text-sm text-muted-foreground mb-2">
          Showing {(currentPage - 1) * DEFAULT_PAGE_SIZE + 1}&ndash;
          {(currentPage - 1) * DEFAULT_PAGE_SIZE + rows.length} of {totalCount} chunks
        </p>
      )}

      <AdminDataTable
        headers={['Title', 'Board', 'Description', 'Created At', 'Actions']}
        items={rows}
        emptyMessage="No chunks found"
        renderRow={(chunk) => (
          <tr key={chunk.id} className="border-t border-border">
            <td className="px-4 py-3">
              <Link
                href={`/admin/chunks/${chunk.id}/edit`}
                className="font-medium text-primary hover:underline"
              >
                {chunk.title}
              </Link>
            </td>
            <td className="px-4 py-3">
              <BoardThumbnail fen={chunk.representativeFen} className="w-20 h-20" />
            </td>
            <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
              {chunk.description ? truncate(chunk.description) : '-'}
            </td>
            <td className="px-4 py-3 text-muted-foreground text-sm">
              {new Date(chunk.createdAt).toLocaleString()}
            </td>
            <td className="px-4 py-3">
              <DeleteChunkButton id={chunk.id} title={chunk.title} />
            </td>
          </tr>
        )}
      />

      <AdminPaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
