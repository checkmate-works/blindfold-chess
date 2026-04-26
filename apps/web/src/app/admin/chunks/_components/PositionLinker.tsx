'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';

import {
  linkPositionToChunk,
  searchPositions,
  unlinkPositionFromChunk,
} from '../_actions/positionChunkActions';
import type { PositionSearchResult } from '../_actions/positionChunkActions';

type LinkedPosition = {
  id: string;
  title: string;
  fen: string;
  type: string;
};

type Props = {
  chunkId: string;
  initialLinkedPositions: LinkedPosition[];
};

export function PositionLinker({ chunkId, initialLinkedPositions }: Props) {
  const [linked, setLinked] = useState<LinkedPosition[]>(initialLinkedPositions);
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<PositionSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const linkedIds = linked.map((p) => p.id);

  const doSearch = useCallback(
    (q: string) => {
      if (q.trim().length === 0) {
        setCandidates([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      searchPositions(q, linkedIds).then((results) => {
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

  function handleLink(position: PositionSearchResult) {
    setError(null);
    startTransition(async () => {
      const result = await linkPositionToChunk(chunkId, position.id);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setLinked((prev) => [...prev, position]);
      setCandidates((prev) => prev.filter((c) => c.id !== position.id));
    });
  }

  function handleUnlink(positionId: string) {
    setError(null);
    startTransition(async () => {
      const result = await unlinkPositionFromChunk(chunkId, positionId);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setLinked((prev) => prev.filter((p) => p.id !== positionId));
    });
  }

  return (
    <div className="mt-8 space-y-4">
      <h2 className="text-lg font-semibold">Linked Positions</h2>

      {error && (
        <div className="p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm">
          {error}
        </div>
      )}

      {linked.length === 0 ? (
        <p className="text-sm text-muted-foreground">No positions linked yet.</p>
      ) : (
        <ul className="space-y-2">
          {linked.map((pos) => (
            <li key={pos.id} className="flex items-center gap-3 p-2 rounded border border-border">
              <BoardThumbnail fen={pos.fen} className="w-12 h-12 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{pos.title}</p>
                <p className="text-xs text-muted-foreground">{pos.type}</p>
              </div>
              <button
                type="button"
                onClick={() => handleUnlink(pos.id)}
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
        <label htmlFor="position-search" className="block text-sm font-medium mb-1">
          Search positions to link
        </label>
        <input
          id="position-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title..."
          className="w-full px-3 py-2 rounded border border-border bg-card text-foreground text-sm"
        />

        {searching && <p className="text-xs text-muted-foreground mt-1">Searching...</p>}

        {candidates.length > 0 && (
          <ul className="mt-2 space-y-1 max-h-60 overflow-y-auto">
            {candidates.map((pos) => (
              <li key={pos.id} className="flex items-center gap-3 p-2 rounded border border-border">
                <BoardThumbnail fen={pos.fen} className="w-10 h-10 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{pos.title}</p>
                  <p className="text-xs text-muted-foreground">{pos.type}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleLink(pos)}
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
