/**
 * Practice List (`/practice`)
 *
 * @description
 * Lists all available practice modules grouped by difficulty level (Beginner,
 * Intermediate, Advanced, Introduction). Each module links to its dedicated
 * practice page. Uses PRACTICE_EMOJIS as the single source of truth for icons.
 *
 * Leads with the Daily Puzzle card (the same one the signed-in dashboard
 * shows) so the page offers a concrete thing to do before the module grid.
 *
 * @flow
 * - Daily Puzzle: today's puzzle, seeded on the UTC date
 * - Beginner: Square Colors, Coordinate Quiz, Legal Moves
 * - Intermediate: Diagonal Quiz, Board Symmetry, Route Planner
 * - Advanced: Position Memory, Puzzle
 * - Expert: Knight's Tour, Recall
 * - Introduction: Algebraic Notation, FEN Reconstruction, Quadrant Anchors
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ChallengeCard } from '@/app/_components';
import { DailyPuzzleCard } from '@/app/_components/DailyPuzzleCard';
import { SITE_URL } from '@/config';

import { JsonLd, generateItemListSchema } from '@/lib/seo/jsonld';

import { BeltRankBadge } from '@/app/[locale]/(public)/dojo/_components/BeltRankBadge';
import { getRankSlugForMenuType } from '@/app/[locale]/(public)/practice/_lib/module-rank-mapping';
import { PRACTICE_EMOJIS } from '@/app/[locale]/(public)/practice/_lib/practice-emojis';
import { ListLink, ListLinkContainer, PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

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

  const sections = [
    {
      title: t('practice.levelBeginner'),
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
      title: t('practice.levelIntermediate'),
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
      title: t('practice.levelAdvanced'),
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
      title: t('practice.levelExpert'),
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
      title: t('practice.levelIntroduction'),
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

  return (
    <>
      <JsonLd data={generateItemListSchema(itemListItems)} />
      <PageLayout
        title={t('practice.title')}
        locale={locale}
        breadcrumb={[{ label: t('navigation.practice') }]}
      >
        <DailyPuzzleCard locale={locale} variant="compact" />

        {sections.map((section) => (
          <section key={section.title} className="space-y-4">
            <SectionTitle>{section.title}</SectionTitle>
            <div className="flex flex-wrap justify-center gap-3">
              {section.practices.map((practice) => {
                const rankSlug = getRankSlugForMenuType(practice.menuType);
                const rankLabel = rankSlug ? tRanks(`rankNames.${rankSlug}`) : null;
                return (
                  <div key={practice.id} className="flex flex-col items-center gap-5">
                    <ChallengeCard
                      locale={locale}
                      href={`/practice/${practice.id}`}
                      label={practice.title}
                      icon={practice.icon}
                    />
                    {rankSlug && rankLabel ? (
                      <BeltRankBadge slug={rankSlug} label={rankLabel} locale={locale} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

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

        <AdSlot slot="content-bottom" />
      </PageLayout>
    </>
  );
}
