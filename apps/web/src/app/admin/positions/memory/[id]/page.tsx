import Link from 'next/link';
import { notFound } from 'next/navigation';

import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core';

import { getPositionById } from '@/lib/positions/queries';

import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';

import { DeletePositionButton } from '../_components/DeletePositionButton';

export default async function PositionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const position = await getPositionById({ id, includeDeleted: true });

  if (!position) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/positions/memory"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back to list
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">{position.title}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="w-full max-w-sm">
          <AnimatedChessBoard
            initialFen={position.fen}
            showCoordinates={false}
            flipped={isBlackToMoveFromFen(position.fen)}
          />
        </div>

        <div className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">ID</dt>
            <dd className="mt-1 text-sm">{position.id}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">User ID</dt>
            <dd className="mt-1 text-sm">{position.userId}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Type</dt>
            <dd className="mt-1 text-sm">{position.type}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">FEN</dt>
            <dd className="mt-1 text-sm font-mono break-all">{position.fen}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Title</dt>
            <dd className="mt-1 text-sm">{position.title}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Description</dt>
            <dd className="mt-1 text-sm">{position.description ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Created At</dt>
            <dd className="mt-1 text-sm">{new Date(position.createdAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Deleted At</dt>
            <dd className="mt-1 text-sm">
              {position.deletedAt ? new Date(position.deletedAt).toLocaleString() : '-'}
            </dd>
          </div>

          {!position.deletedAt && (
            <div className="pt-4">
              <DeletePositionButton id={position.id} title={position.title} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
