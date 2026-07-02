'use client';

import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { getSharedGame } from '@/lib/games/shared-game-store';

import type { Locale } from '@/app/[locale]/_lib/types';

type Params = {
  locale: Locale;
  /** Local game id whose published counterpart (if any) is tracked in localStorage. */
  gameId: string | undefined;
};

type Result = {
  /** Publish this game (or open it if already published from this browser). */
  handleShare: () => void;
  /** Whether this game was already published from this browser. */
  isShared: boolean;
  /** The published game's id if shared from this browser, else null. */
  sharedPublishedId: string | null;
};

/**
 * The "share this finished game" action, shared by the result screen
 * (`ResultClient`) and the in-play finished-game navigation
 * (`useFinishedGameNavigation`) so both route identically. A finished local game
 * may already have been published from this browser; that local→published
 * mapping lives in localStorage (`getSharedGame`). Share then opens the
 * published game, else the publish form. The mapping is read client-side after
 * mount (localStorage is unavailable on the server), so `isShared` is false on
 * the first render.
 */
export function useSharedGameLink({ locale, gameId }: Params): Result {
  const router = useRouter();

  const [sharedPublishedId, setSharedPublishedId] = useState<string | null>(null);
  useEffect(() => {
    if (!gameId) return;
    setSharedPublishedId(getSharedGame(gameId)?.publishedId ?? null);
  }, [gameId]);

  const handleShare = useCallback(() => {
    if (!gameId) return;
    router.push(
      sharedPublishedId
        ? `/${locale}/games/shared/${sharedPublishedId}`
        : `/${locale}/games/shared/new?gameId=${gameId}`
    );
  }, [router, locale, gameId, sharedPublishedId]);

  return { handleShare, isShared: sharedPublishedId !== null, sharedPublishedId };
}
