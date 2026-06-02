import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getGameById } from '@/lib/db/games';
import { UUID_RE } from '@/lib/validations/uuid';

import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * Metadata for the shared-game detail. The canonical points at the bare
 * permalink so the `?color=` orientation and `#move` URL variants de-duplicate
 * to one URL.
 */
export async function buildSharedGameMetadata({
  locale,
  id,
}: {
  locale: Locale;
  id: string;
}): Promise<Metadata> {
  const detail = UUID_RE.test(id) ? await getGameById(id) : null;
  const title =
    detail?.game.title ??
    (await getTranslations({ locale, namespace: 'sharedGames' }))('detail.fallbackTitle');

  return {
    ...generateCanonicalMetadata({ locale, path: `games/shared/${id}`, title }),
    title: resolveTitle(title, locale),
  };
}
