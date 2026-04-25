import Link from 'next/link';

import { ChunkForm } from '../_components/ChunkForm';

export default function NewChunkPage() {
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
      <h1 className="text-2xl font-bold mb-6">New Chunk</h1>
      <ChunkForm mode="create" />
    </div>
  );
}
