import Link from 'next/link';
import { notFound } from 'next/navigation';

import { parseBoardAnnotations } from '@/lib/board-annotations/parse';
import { getChunkById } from '@/lib/chunks/queries';
import { getLinkedThemesForChunk } from '@/lib/themes/queries';

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

  const [linkedPositions, linkedThemes] = await Promise.all([
    getLinkedPositions(id),
    // Locale is irrelevant in admin context — we only render `termEn` —
    // but the query insists on a Locale to share the public shape, so
    // pass 'en' as the canonical admin locale.
    getLinkedThemesForChunk(chunk.id, 'en'),
  ]);

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
          annotations: parseBoardAnnotations(chunk.annotations),
        }}
      />

      {!chunk.deletedAt && (
        <PositionLinker chunkId={chunk.id} initialLinkedPositions={linkedPositions} />
      )}

      <div className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Linked Glossary Terms</h2>
        <p className="text-sm text-muted-foreground">
          Read-only here. Edit the link from{' '}
          <Link href="/admin/glossary" className="underline hover:no-underline">
            /admin/glossary
          </Link>{' '}
          on the term's own page.
        </p>
        {linkedThemes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No glossary terms linked.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {linkedThemes.map((theme) => (
              <Link
                key={theme.id}
                href={`/admin/glossary/${theme.slug}`}
                className="px-3 py-1 text-sm rounded-full bg-muted text-foreground hover:bg-secondary transition-colors"
              >
                {theme.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
