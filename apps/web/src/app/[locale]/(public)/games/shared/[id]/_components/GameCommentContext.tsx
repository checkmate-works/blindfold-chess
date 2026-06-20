'use client';

import { type ReactNode, createContext, useContext } from 'react';

import type { Locale } from '@/app/[locale]/_lib/types';

/** Result of a mutating handler — `error` is already localized for display. */
export type MutationResult = { error?: string };

/** The signed-in viewer's comment-author identity (mirrors `getCommentUserProfile`). */
export type CommentUser = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

/**
 * Thread-wide values every `GameCommentNode` needs, carried via context so the
 * recursive node tree does not have to forward them through every call site
 * (the same reason the topics `CommentTreeContext` exists). The mutating
 * handlers update the thread's optimistic state and localize their own errors.
 */
export type GameCommentContextValue = {
  locale: Locale;
  /** Undefined when the reader is anonymous — disables reply / edit / delete. */
  currentUserId?: string;
  reply: (parentId: string, body: string) => Promise<MutationResult>;
  edit: (commentId: string, body: string) => Promise<MutationResult>;
  remove: (commentId: string) => Promise<MutationResult>;
};

const GameCommentContext = createContext<GameCommentContextValue | null>(null);

export function GameCommentProvider({
  value,
  children,
}: {
  value: GameCommentContextValue;
  children: ReactNode;
}) {
  return <GameCommentContext.Provider value={value}>{children}</GameCommentContext.Provider>;
}

export function useGameCommentContext(): GameCommentContextValue {
  const ctx = useContext(GameCommentContext);
  if (ctx === null) {
    throw new Error('useGameCommentContext must be used within a GameCommentProvider');
  }
  return ctx;
}
