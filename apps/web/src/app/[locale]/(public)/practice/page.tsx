/**
 * Practice List (`/practice`)
 *
 * @description
 * Lists every practice module as a card carrying the module's emoji, the rank
 * it contributes toward, and an example band showing the question it asks
 * (`PracticeCardVisual`). One grid, narrowed by difficulty through
 * `PracticeLevelFilter` rather than split under per-level headings — the
 * headings pushed the later bands below the fold on a phone, and a reader
 * looking for "something at my level" had to scroll past the other bands to
 * find out what was in theirs.
 *
 * Leads with the Daily Puzzle card (the same one the signed-in dashboard
 * shows) so the page offers a concrete thing to do before the module grid.
 *
 * Uses PRACTICE_EMOJIS as the single source of truth for icons.
 *
 * @flow
 * - Daily Puzzle: today's puzzle, seeded on the UTC date
 * - Beginner: Square Colors, Coordinate Quiz, Legal Moves
 * - Intermediate: Diagonal Quiz, Board Symmetry, Route Planner
 * - Advanced: Position Memory, Puzzle
 * - Expert: Knight's Tour, Recall
 * - Introduction: Algebraic Notation, FEN Reconstruction, Quadrant Anchors
 *
 * The bands each say something the others do not, so the list keeps all
 * five. Merging them to fit the filter into one row on a phone was tried
 * (2026-09) and cost more than it saved: Expert inside Advanced hid which
 * two modules are the hard ones, and Introduction inside Beginner both lost
 * "this is reference material, not a step" and moved the notation modules
 * to the top of the unfiltered grid, where the list had always ended with
 * them. The filter wraps instead. See `PRACTICE_LEVELS`.
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { DailyPuzzleCard } from '@/app/_components/DailyPuzzleCard';
import { SITE_URL } from '@/config';

import type { PracticeMenuType } from '@/lib/db/practice-menu-types';
import { JsonLd, generateItemListSchema } from '@/lib/seo/jsonld';

import {
  PracticeLevelFilter,
  type PracticeLevelFilterItem,
} from '@/app/[locale]/(public)/practice/_components/PracticeLevelFilter';
import { PracticeMenuCard } from '@/app/[locale]/(public)/practice/_components/PracticeMenuCard';
import { getRankSlugForMenuType } from '@/app/[locale]/(public)/practice/_lib/module-rank-mapping';
import { PRACTICE_EMOJIS } from '@/app/[locale]/(public)/practice/_lib/practice-emojis';
import { ListLink, ListLinkContainer, PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { PracticeLevel } from './_lib/practice-levels';

type PracticeEntry = {
  /** Route segment under `/practice`. */
  id: string;
  /** Keys the rank mapping and the card's example band. */
  menuType: PracticeMenuType;
  title: string;
  icon: string;
};

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export const generateStaticParams = generateLocaleStaticParams;

// Lands at 1h in the route table, not the layout's week, via `DailyPuzzleCard`
// → `getDailyPuzzle`. Deliberate; see `selectDailyPuzzle`.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'metadata.practice', path: 'practice' });
}

export default async function PracticePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const tRanks = await getTranslations({ locale, namespace: 'ranks' });

  const sections: { level: PracticeLevel; practices: PracticeEntry[] }[] = [
    {
      level: 'beginner',
      practices: [
        {
          id: 'square-colors',
          menuType: 'square_colors',
          title: t('practice.squareColors.title'),
          icon: PRACTICE_EMOJIS.square_colors,
        },
        {
          id: 'coordinate-quiz',
          menuType: 'coordinate_quiz',
          title: t('practice.coordinateQuiz.title'),
          icon: PRACTICE_EMOJIS.coordinate_quiz,
        },
        {
          id: 'legal-moves',
          menuType: 'legal_moves',
          title: t('practice.legalMoves.title'),
          icon: PRACTICE_EMOJIS.legal_moves,
        },
      ],
    },
    {
      level: 'intermediate',
      practices: [
        {
          id: 'diagonal-quiz',
          menuType: 'diagonal_quiz',
          title: t('practice.diagonalQuiz.title'),
          icon: PRACTICE_EMOJIS.diagonal_quiz,
        },
        {
          id: 'board-symmetry',
          menuType: 'board_symmetry',
          title: t('practice.boardSymmetry.title'),
          icon: PRACTICE_EMOJIS.board_symmetry,
        },
        {
          id: 'route-planner',
          menuType: 'route_planner',
          title: t('practice.routePlanner.title'),
          icon: PRACTICE_EMOJIS.route_planner,
        },
      ],
    },
    {
      level: 'advanced',
      practices: [
        {
          id: 'position-memory',
          menuType: 'position_memory',
          title: t('practice.positionMemory.title'),
          icon: PRACTICE_EMOJIS.position_memory,
        },
        {
          id: 'puzzle',
          menuType: 'puzzle',
          title: t('practice.puzzle.title'),
          icon: PRACTICE_EMOJIS.puzzle,
        },
      ],
    },
    {
      level: 'expert',
      practices: [
        {
          id: 'knight-tour',
          menuType: 'knight_tour',
          title: t('practice.knightTour.title'),
          icon: PRACTICE_EMOJIS.knight_tour,
        },
        {
          id: 'recall',
          menuType: 'recall',
          title: t('recall.title'),
          icon: PRACTICE_EMOJIS.recall,
        },
      ],
    },
    {
      level: 'introduction',
      practices: [
        {
          id: 'algebraic-notation',
          menuType: 'algebraic_notation',
          title: t('practice.algebraicNotation.title'),
          icon: PRACTICE_EMOJIS.algebraic_notation,
        },
        {
          id: 'fen',
          menuType: 'fen',
          title: t('practice.fen.title'),
          icon: PRACTICE_EMOJIS.fen,
        },
        {
          id: 'quadrants',
          menuType: 'quadrant_anchors',
          title: t('practice.quadrantAnchors.title'),
          icon: PRACTICE_EMOJIS.quadrant_anchors,
        },
      ],
    },
  ];

  const itemListItems = sections.flatMap((section) =>
    section.practices.map((practice) => ({
      name: practice.title,
      url: `${SITE_URL}/${locale}/practice/${practice.id}`,
    }))
  );

  const levelLabels: Record<PracticeLevel, string> = {
    beginner: t('practice.levelBeginner'),
    intermediate: t('practice.levelIntermediate'),
    advanced: t('practice.levelAdvanced'),
    expert: t('practice.levelExpert'),
    introduction: t('practice.levelIntroduction'),
  };

  // Every card is rendered here, on the server, and the filter only decides
  // which of them to show — so the prerendered HTML carries the whole list.
  const items: PracticeLevelFilterItem[] = sections.flatMap((section) =>
    section.practices.map((practice) => {
      const rankSlug = getRankSlugForMenuType(practice.menuType);
      const rankLabel = rankSlug ? tRanks(`rankNames.${rankSlug}`) : null;
      return {
        key: practice.id,
        level: section.level,
        card: (
          <PracticeMenuCard
            locale={locale}
            href={`/practice/${practice.id}`}
            level={section.level}
            levelLabel={levelLabels[section.level]}
            icon={practice.icon}
            title={practice.title}
            menuType={practice.menuType}
            rank={rankSlug && rankLabel ? { slug: rankSlug, label: rankLabel } : null}
          />
        ),
      };
    })
  );

  return (
    <>
      <JsonLd data={generateItemListSchema(itemListItems)} />
      <PageLayout
        title={t('practice.title')}
        locale={locale}
        breadcrumb={[{ label: t('navigation.practice') }]}
      >
        <DailyPuzzleCard locale={locale} variant="compact" />

        <PracticeLevelFilter
          items={items}
          basePath={`/${locale}/practice`}
          levelLabels={levelLabels}
          allLabel={t('practice.filter.all')}
          filterLabel={t('practice.filter.label')}
          listHeading={t('practice.modulesTitle')}
        />

        {/* Above the "Related" heading, not under it. Everything below that
            heading is navigation off this page — the dojo and the
            leaderboard — so the module grid is where the page's own content
            ends, and that is where the ad belongs. Under the links it was
            the last thing on the page, past the point a reader has already
            decided to leave.

            `content-middle`, because that is the slot this position takes
            everywhere else (the learn articles, the glossary lists, the
            catalogues). The two banner slots are separate AdSense units, so
            the name is not cosmetic — it decides which unit serves here and
            where the revenue is reported. */}
        <AdSlot slot="content-middle" />

        <section className="space-y-4">
          <SectionTitle>{t('practice.related')}</SectionTitle>
          <ListLinkContainer>
            <ListLink href="/dojo" icon="🥋" title={t('practice.viewDojo')} locale={locale} />
            <ListLink
              href="/leaderboard/score/all-time"
              icon="🏆"
              title={t('practice.viewLeaderboard')}
              locale={locale}
            />
          </ListLinkContainer>
        </section>
      </PageLayout>
    </>
  );
}
