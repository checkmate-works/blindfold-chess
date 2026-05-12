'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import type { ChunkSearchResult } from '@/lib/glossary-admin/queries';
import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';

import {
  linkChunkToTerm,
  searchChunksAction,
  unlinkChunkFromTerm,
} from '../_actions/chunkThemeActions';

export type LinkedChunkRow = {
  id: string;
  slug: string;
  title: string;
  representativeFen: string;
};

type Props = {
  termId: string;
  termSlug: string;
  initialLinkedChunks: LinkedChunkRow[];
};

/**
 * Admin widget for managing `chunk_themes` from the term side.
 *
 * Almost a structural twin of `PositionLinker` (in the chunk admin):
 * same debounced title search, same link/unlink server actions, same
 * "linked list above, candidates below" layout. Kept as a separate
 * component rather than generalized because the two have diverging
 * payloads (chunk row vs position row) and merging them would slow
 * future per-side UX evolution (e.g. showing chunk-specific badges
 * here, or linking-history audit on the position side).
 */
export function ChunkLinker({ termId, termSlug, initialLinkedChunks }: Props) {
  const [linked, setLinked] = useState<LinkedChunkRow[]>(initialLinkedChunks);
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<ChunkSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const linkedIds = linked.map((c) => c.id);

  const doSearch = useCallback(
    (q: string) => {
      if (q.trim().length === 0) {
        setCandidates([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      searchChunksAction(q, linkedIds).then((results) => {
        setCandidates(results);
        setSearching(false);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [linkedIds.join(',')]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  function handleLink(chunk: ChunkSearchResult) {
    setError(null);
    startTransition(async () => {
      const result = await linkChunkToTerm(termId, chunk.id, termSlug);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setLinked((prev) => [...prev, chunk]);
      setCandidates((prev) => prev.filter((c) => c.id !== chunk.id));
    });
  }

  function handleUnlink(chunkId: string) {
    setError(null);
    startTransition(async () => {
      const result = await unlinkChunkFromTerm(termId, chunkId, termSlug);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setLinked((prev) => prev.filter((c) => c.id !== chunkId));
    });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Linked Chunks</h2>

      {error && (
        <div className="p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm">
          {error}
        </div>
      )}

      {linked.length === 0 ? (
        <p className="text-sm text-muted-foreground">No chunks linked yet.</p>
      ) : (
        <ul className="space-y-2">
          {linked.map((chunk) => (
            <li key={chunk.id} className="flex items-center gap-3 p-2 rounded border border-border">
              <BoardThumbnail fen={chunk.representativeFen} className="w-12 h-12 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{chunk.title}</p>
                <p className="text-xs text-muted-foreground font-mono">{chunk.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => handleUnlink(chunk.id)}
                disabled={isPending}
                className="px-2 py-1 text-xs rounded border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50 transition-colors"
              >
                Unlink
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="pt-4 border-t border-border">
        <label htmlFor="chunk-search" className="block text-sm font-medium mb-1">
          Search chunks to link
        </label>
        <input
          id="chunk-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title..."
          className="w-full px-3 py-2 rounded border border-border bg-card text-foreground text-sm"
        />

        {searching && <p className="text-xs text-muted-foreground mt-1">Searching...</p>}

        {candidates.length > 0 && (
          <ul className="mt-2 space-y-1 max-h-60 overflow-y-auto">
            {candidates.map((chunk) => (
              <li
                key={chunk.id}
                className="flex items-center gap-3 p-2 rounded border border-border"
              >
                <BoardThumbnail fen={chunk.representativeFen} className="w-10 h-10 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{chunk.title}</p>
                  <p className="text-xs text-muted-foreground font-mono">{chunk.slug}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleLink(chunk)}
                  disabled={isPending}
                  className="px-2 py-1 text-xs rounded border border-primary text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50 transition-colors"
                >
                  Link
                </button>
              </li>
            ))}
          </ul>
        )}

        {!searching && query.trim().length > 0 && candidates.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1">No results found.</p>
        )}
      </div>
    </div>
  );
}
