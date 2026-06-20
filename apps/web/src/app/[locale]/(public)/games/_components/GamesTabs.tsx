import { getTranslations } from 'next-intl/server';

import { LinkTabs } from '@/app/[locale]/_components/LinkTabs';
import type { LinkTabItem } from '@/app/[locale]/_components/LinkTabs';

export type GamesTabKey = 'mine' | 'shared';

type Props = {
  /** Which tab is the current page (rendered highlighted). */
  active: GamesTabKey;
  locale: string;
};

/**
 * Shared tab nav for the two games list surfaces: the player's own
 * device-local game history (`/games`) and the public community gallery
 * (`/games/shared`). Centralizes the labels / emojis / destinations in one
 * place so both pages render an identical row and only pass which tab is
 * `active` — the same convention as {@link TopicTabs}.
 *
 * Async Server Component (reads translations) — import directly, never via the
 * `_components` barrel, to keep it out of client bundles.
 */
export async function GamesTabs({ active, locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'gamesPage.tabs' });

  const items: LinkTabItem[] = [
    { value: 'mine', label: `🎮 ${t('mine')}`, href: '/games' },
    { value: 'shared', label: `🌐 ${t('shared')}`, href: '/games/shared' },
  ];

  return (
    <LinkTabs
      items={items}
      activeValue={active}
      locale={locale}
      aria-label={t('label')}
      variant="underline"
    />
  );
}
