import { getTranslations } from 'next-intl/server';

import { LinkTabs } from '@/app/[locale]/_components/LinkTabs';
import type { LinkTabItem } from '@/app/[locale]/_components/LinkTabs';

export type TopicTabKey = 'recent' | 'chunks' | 'openings' | 'squares';

type Props = {
  /** Which tab is the current page (rendered highlighted). */
  active: TopicTabKey;
  locale: string;
};

/**
 * Shared tab nav for the topics family of pages (recent feed + the three
 * category catalogs). Centralizes the tab set — labels, emojis, order, and
 * destinations — in one place so every page renders an identical row and only
 * passes which tab is `active`. The `recent` tab links back to `/topics`; the
 * category tabs link to their catalogs.
 *
 * Async Server Component (reads translations) — import directly, never via the
 * `_components` barrel, to keep it out of client bundles.
 */
export async function TopicTabs({ active, locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'topics' });

  const items: LinkTabItem[] = [
    { value: 'recent', label: `🆕 ${t('tabs.recent')}`, href: '/topics' },
    { value: 'chunks', label: `🧠 ${t('categories.chunks.title')}`, href: '/chunks' },
    { value: 'openings', label: `📖 ${t('categories.openings.title')}`, href: '/topics/openings' },
    { value: 'squares', label: `🔳 ${t('categories.squares.title')}`, href: '/topics/squares' },
  ];

  return <LinkTabs items={items} activeValue={active} locale={locale} aria-label={t('title')} />;
}
