import type { Href } from "expo-router";
import type { RankJourney } from "@blindfold-chess/features/dojo-journey";
import type { RankSlug } from "@blindfold-chess/features/dojo-ranks";

/** How far one guide has been read. */
export type GuideReadingProgress = {
  /** Pages read, out of `total`. */
  readonly read: number;
  readonly total: number;
  /** The first page (1-based) not read yet; undefined once every page is. */
  readonly firstUnreadPage?: number;
};

/**
 * The pages (1-based) of `rank`'s guide that are read.
 *
 * @description
 * A guide's pages are steps of whichever rank's journey reads it — the
 * unranked guide is part of 5kyu's learn stage, not mukyu's — so a page is
 * read when it is done in any of `journeys`. Looking at one rank's journey
 * only would miss the pages that rank does not own, and a held rank, whose
 * steps are all done, would not count for the guide it read. The guide
 * screen and the learn tab's guide list both ask this one function, so a
 * page cannot be read on one screen and unread on the other.
 */
export function readGuidePages(
  journeys: readonly RankJourney[],
  rank: RankSlug,
): ReadonlySet<number> {
  const read = new Set<number>();
  for (const journey of journeys) {
    for (const step of journey.steps) {
      if (step.kind === "guidePage" && step.guideRank === rank && step.done) {
        read.add(step.page);
      }
    }
  }
  return read;
}

/**
 * How far `rank`'s guide of `total` pages has been read, by
 * {@link readGuidePages}. A page number past `total` is not counted, so a
 * record kept from a longer edition of the guide cannot read "6 / 5".
 */
export function guideReadingProgress(
  journeys: readonly RankJourney[],
  rank: RankSlug,
  total: number,
): GuideReadingProgress {
  const pages = readGuidePages(journeys, rank);
  let read = 0;
  let firstUnreadPage: number | undefined;
  for (let page = 1; page <= total; page++) {
    if (pages.has(page)) read++;
    else firstUnreadPage ??= page;
  }
  return firstUnreadPage === undefined
    ? { read, total }
    : { read, total, firstUnreadPage };
}

/**
 * The guide screen opened at `page` (1-based). The first page is the plain
 * path, the same one every other link to the guide uses.
 */
export function guidePageHref(rank: RankSlug, page: number): Href {
  return (
    page > 1 ? `/dojo/guides/${rank}?page=${page}` : `/dojo/guides/${rank}`
  ) as Href;
}

/**
 * The page (1-based) the guide screen opens at, from its `page` route
 * param. Anything but a whole number from 1 to `pageCount` — no param, a
 * word, "2.5", a page the guide does not have — opens the first page: a
 * stale or mistyped link still opens the guide rather than nothing.
 */
export function guideStartPage(
  param: string | string[] | undefined,
  pageCount: number,
): number {
  if (typeof param !== "string" || !/^\d+$/.test(param)) return 1;
  const page = Number(param);
  return page >= 1 && page <= pageCount ? page : 1;
}
