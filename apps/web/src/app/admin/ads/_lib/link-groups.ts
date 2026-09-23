import { isPlaceholderAdHref } from '@/lib/ads/placeholder';

/**
 * The creatives that advertise one thing, found by their English title, so
 * its link can be set once instead of once per slot.
 *
 * The same book runs in several slots as separate rows — each row id is the
 * sub-ID its clicks are reported under, and a report is only useful if it can
 * tell the slots apart — but all of them go to the same store page. The
 * English title is what those rows have in common: `ad_creatives` has no
 * product key, and `en` is the one copy every creative must carry. Two
 * different products under an identical title would be grouped together,
 * which is why the page lists every slot a group covers before anything is
 * applied to it.
 */
export type CreativeLinkGroup = {
  title: string;
  creativeIds: string[];
  /** The slots the group's rows are in, in first-seen order. */
  slots: string[];
  activeCount: number;
  /** Rows still on the seeded placeholder link. */
  placeholderCount: number;
  /** The distinct real links the group's rows carry, placeholder excluded. */
  hrefs: string[];
};

type CreativeRow = { id: string; slot: string; href: string; isActive: boolean };

export function groupCreativesByTitle(
  creatives: readonly CreativeRow[],
  englishTitleById: ReadonlyMap<string, string>
): CreativeLinkGroup[] {
  const groups = new Map<string, CreativeLinkGroup>();
  for (const creative of creatives) {
    const title = englishTitleById.get(creative.id);
    // No `en` title is a row the validator forbids saving; there is nothing
    // to group it by, and its own edit form is still there to fix it.
    if (!title) continue;
    const group = groups.get(title) ?? {
      title,
      creativeIds: [],
      slots: [],
      activeCount: 0,
      placeholderCount: 0,
      hrefs: [],
    };
    group.creativeIds.push(creative.id);
    if (!group.slots.includes(creative.slot)) group.slots.push(creative.slot);
    if (creative.isActive) group.activeCount += 1;
    if (isPlaceholderAdHref(creative.href)) group.placeholderCount += 1;
    else if (!group.hrefs.includes(creative.href)) group.hrefs.push(creative.href);
    groups.set(title, group);
  }
  return [...groups.values()].sort((a, b) => a.title.localeCompare(b.title));
}
