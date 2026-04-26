import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getChunkById } from '@/lib/chunks/queries';

import { getLinkedPositions } from '../../_actions/positionChunkActions';
import { ChunkForm } from '../../_components/ChunkForm';
import { DeleteChunkButton } from '../../_components/DeleteChunkButton';
import { PositionLinker } from '../../_components/PositionLinker';

export default async function EditChunkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const chunk = await getChunkById({ id, includeDeleted: true });

  if (!chunk) {
    notFound();
  }

  const linkedPositions = await getLinkedPositions(id);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/chunks"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back to list
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Edit Chunk</h1>
        {!chunk.deletedAt && <DeleteChunkButton id={chunk.id} title={chunk.title} />}
      </div>

      <dl className="mb-6 space-y-2 text-sm">
        <div>
          <dt className="inline text-muted-foreground">ID: </dt>
          <dd className="inline font-mono">{chunk.id}</dd>
        </div>
        <div>
          <dt className="inline text-muted-foreground">Author: </dt>
          <dd className="inline font-mono">{chunk.userId ?? '-'}</dd>
        </div>
        <div>
          <dt className="inline text-muted-foreground">Created: </dt>
          <dd className="inline">{new Date(chunk.createdAt).toLocaleString()}</dd>
        </div>
        {chunk.deletedAt && (
          <div>
            <dt className="inline text-muted-foreground">Deleted: </dt>
            <dd className="inline">{new Date(chunk.deletedAt).toLocaleString()}</dd>
          </div>
        )}
      </dl>

      <ChunkForm
        mode="edit"
        initial={{
          id: chunk.id,
          representativeFen: chunk.representativeFen,
          title: chunk.title,
          slug: chunk.slug,
          description: chunk.description,
          userId: chunk.userId,
        }}
      />

      {!chunk.deletedAt && (
        <PositionLinker chunkId={chunk.id} initialLinkedPositions={linkedPositions} />
      )}
    </div>
  );
}
