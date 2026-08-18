import { getTranslations } from 'next-intl/server';

import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { BreadcrumbSkeleton } from '@/app/[locale]/_components/Breadcrumb';

import { PuzzleResultContentSkeleton } from '../../_components/PuzzleResultContentSkeleton';

/**
 * Puzzle result loading skeleton.
 *
 * Tailored to `PuzzleResultClient` (apps/web/src/app/[locale]/(public)/practice/(free-play)/puzzle/_components/PuzzleResultClient.tsx),
 * which renders into `<PagePanel>` under a static `<PageTitle>`. The shared
 * `PracticeResultLoadingSkeleton` was designed for the 11 challenge result
 * pages (score summary + leaderboard + related-module card) and matches none
 * of the puzzle result content, so it is not reused here.
 *
 * Mirrored sections (in render order):
 *   - PageTitle "Puzzle Result"                              — static i18n
 *   - SectionTitle "Solution Replay"                         — static i18n
 *   - Chess board (max-w-md, square)                         — `<BoardSkeleton>`
 *   - Solution text                                          — single bar
 *   - ExpGainDisplay                                         — conditional, reserved
 *   - 2 action buttons (Try Again / Back to Puzzles)         — full-width primary + secondary
 *   - Divider + Breadcrumb (Home / Practice / Puzzle / <position bar> / Puzzle Result)
 *
 * Conditional client-only sections (Attempt History, peek count) are NOT
 * reserved here. They render only after `PuzzleResultClient` reads
 * `sessionStorage` post-hydration, so they are absent from the SSR output the
 * skeleton swaps into and reserving them would create the opposite of the
 * usual CLS — a collapse on hydrate.
 */
export default async function PuzzleResultLoading() {
  const locale = await getLocaleFromPathnameHeader();
  const [t, tNav] = await Promise.all([
    getTranslations({ locale, namespace: 'practice.puzzle' }),
    getTranslations({ locale, namespace: 'navigation' }),
  ]);

  return (
    <div className="space-y-8">
      <PageTitle>{t('result.title')}</PageTitle>

      <PagePanel>
        <PuzzleResultContentSkeleton />

        <Divider />

        {/* Breadcrumb: [Home logo] / Practice / Puzzle / <puzzle title bar> /
            Puzzle Result. Composition mirrors the page's `<Breadcrumb>` items
            — three static crumbs (`navigation.practice`,
            `practice.puzzle.list.title`, `practice.puzzle.result.title`) plus
            one dynamic crumb (the puzzle title, fetched per request). */}
        <BreadcrumbSkeleton
          crumbs={[
            { label: tNav('practice') },
            { label: t('list.title') },
            { widthClass: 'w-32' },
            { label: t('result.title'), current: true },
          ]}
        />
      </PagePanel>
    </div>
  );
}
