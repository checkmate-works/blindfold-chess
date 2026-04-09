'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { validateFen } from '@blindfold-chess/features/chess-core';

import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';

import { createPosition } from '../_actions/createPosition';

export function PositionForm() {
  const router = useRouter();
  const [fen, setFen] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isFenValid = fen.trim() !== '' && validateFen(fen.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const result = await createPosition({ fen, title, description: description || null, userId });

    setPending(false);

    if ('error' in result) {
      setError(result.error);
      return;
    }

    router.push('/admin/positions/memory');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="fen" className="block text-sm font-medium mb-1">
          FEN <span className="text-destructive">*</span>
        </label>
        <input
          id="fen"
          type="text"
          value={fen}
          onChange={(e) => setFen(e.target.value)}
          placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
          className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
          required
        />
        {fen.trim() && !isFenValid && (
          <p className="text-sm text-destructive mt-1">Invalid FEN position</p>
        )}
      </div>

      {isFenValid && (
        <div className="w-64">
          <AnimatedChessBoard
            initialFen={fen.trim()}
            showCoordinates={false}
            flipped={fen.trim().split(' ')[1] === 'b'}
          />
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          Title <span className="text-destructive">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
        />
      </div>

      <div>
        <label htmlFor="userId" className="block text-sm font-medium mb-1">
          User ID <span className="text-destructive">*</span>
        </label>
        <input
          id="userId"
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
          required
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {pending ? 'Creating...' : 'Create Position'}
      </button>
    </form>
  );
}
