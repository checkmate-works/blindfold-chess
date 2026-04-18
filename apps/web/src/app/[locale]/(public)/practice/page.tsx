/**
 * Practice List (`/practice`)
 *
 * @description
 * Lists all available practice modules grouped by difficulty level (Beginner,
 * Intermediate, Advanced, Introduction). Each module links to its dedicated
 * practice page. Uses PRACTICE_EMOJIS as the single source of truth for icons.
 *
 * @flow
 * - Beginner: Square Colors, Coordinate Quiz, Legal Moves
 * - Intermediate: Diagonal Quiz, Board Symmetry, Route Planner
 * - Advanced: Position Memory, Knight's Tour, Move Sequence
 * - Introduction: Algebraic Notation, FEN Reconstruction, Quadrant Anchors
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

import { ChallengeCard } from '@/app/_components';
import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV, SITE_URL } from '@/config';

import { JsonLd, generateItemListSchema } from '@/lib/seo/jsonld';

import { PRACTICE_EMOJIS } from '@/app/[locale]/(public)/practice/_lib/practice-emojis';
import {
  DashboardCard,
  DashboardSection,
  DashboardSectionHeader,
  Divider,
  PagePanel,
  PageTitle,
} from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'metadata.practice' });

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice', title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function PracticePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  const sections = [
    {
      title: t('practice.levelBeginner'),
      sectionIcon: '🌱',
      practices: [
        {
          id: 'square-colors',
          title: t('practice.squareColors.title'),
          icon: PRACTICE_EMOJIS.square_colors,
        },
        {
          id: 'coordinate-quiz',
          title: t('practice.coordinateQuiz.title'),
          icon: PRACTICE_EMOJIS.coordinate_quiz,
        },
        {
          id: 'legal-moves',
          title: t('practice.legalMoves.title'),
          icon: PRACTICE_EMOJIS.legal_moves,
        },
      ],
    },
    {
      title: t('practice.levelIntermediate'),
      sectionIcon: '📚',
      practices: [
        {
          id: 'diagonal-quiz',
          title: t('practice.diagonalQuiz.title'),
          icon: PRACTICE_EMOJIS.diagonal_quiz,
        },
        {
          id: 'board-symmetry',
          title: t('practice.boardSymmetry.title'),
          icon: PRACTICE_EMOJIS.board_symmetry,
        },
        {
          id: 'route-planner',
          title: t('practice.routePlanner.title'),
          icon: PRACTICE_EMOJIS.route_planner,
        },
      ],
    },
    {
      title: t('practice.levelAdvanced'),
      sectionIcon: '🎓',
      practices: [
        {
          id: 'position-memory',
          title: t('practice.positionMemory.title'),
          icon: PRACTICE_EMOJIS.position_memory,
        },
        {
          id: 'puzzle',
          title: t('practice.puzzle.title'),
          icon: PRACTICE_EMOJIS.puzzle,
        },
        {
          id: 'knight-tour',
          title: t('practice.knightTour.title'),
          icon: PRACTICE_EMOJIS.knight_tour,
        },
        {
          id: 'move-sequence',
          title: t('practice.moveSequence.title'),
          icon: PRACTICE_EMOJIS.move_sequence,
        },
      ],
    },
    {
      title: t('practice.levelIntroduction'),
      sectionIcon: '📖',
      practices: [
        {
          id: 'algebraic-notation',
          title: t('practice.algebraicNotation.title'),
          icon: PRACTICE_EMOJIS.algebraic_notation,
        },
        { id: 'fen', title: t('practice.fen.title'), icon: PRACTICE_EMOJIS.fen },
        {
          id: 'quadrants',
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
    <div className="space-y-8">
      <JsonLd data={generateItemListSchema(itemListItems)} />
      <PageTitle>{t('practice.title')}</PageTitle>

      <PagePanel>
        <DashboardCard>
          {sections.map((section) => (
            <DashboardSection key={section.title}>
              <DashboardSectionHeader
                icon={<span className="text-lg">{section.sectionIcon}</span>}
                title={section.title}
              />
              <div className="flex flex-wrap gap-3 mt-3">
                {section.practices.map((practice) => (
                  <ChallengeCard
                    key={practice.id}
                    locale={locale}
                    href={`/practice/${practice.id}`}
                    label={practice.title}
                    icon={practice.icon}
                  />
                ))}
              </div>
            </DashboardSection>
          ))}
        </DashboardCard>

        <div className="text-center pt-4">
          <Link
            href={`/${locale}/leaderboard/score/all-time`}
            className="text-primary hover:underline text-sm font-medium"
          >
            {t('practice.viewLeaderboard')}
          </Link>
        </div>

        {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
        )}

        <Divider />

        <Breadcrumb items={[{ label: t('navigation.practice') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
