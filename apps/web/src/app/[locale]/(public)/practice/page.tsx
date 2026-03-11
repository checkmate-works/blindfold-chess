import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SITE_URL } from '@/config';

import { JsonLd, generateItemListSchema } from '@/lib/jsonld';

import { Breadcrumb, Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PracticeCard } from './_components/PracticeCard';
import { PracticeTabs } from './_components/PracticeTabs';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice' }),
    title: t('practice.title'),
    description: t('practice.description'),
  };
}

export default async function PracticePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const sections = [
    {
      title: t('practice.levelBeginner'),
      practices: [
        {
          id: 'square-colors',
          title: t('practice.squareColors.title'),
          description: t('practice.squareColors.description'),
          icon: '🎨',
          thumbnail: '/images/practice/square-colors.png',
        },
        {
          id: 'legal-moves',
          title: t('practice.legalMoves.title'),
          description: t('practice.legalMoves.description'),
          icon: '♟️',
          thumbnail: '/images/practice/legal-moves.png',
        },
        {
          id: 'coordinate-quiz',
          title: t('practice.coordinateQuiz.title'),
          description: t('practice.coordinateQuiz.description'),
          icon: '🎯',
          thumbnail: '/images/practice/coordinate-quiz.png',
        },
      ],
    },
    {
      title: t('practice.levelIntermediate'),
      practices: [
        {
          id: 'board-symmetry',
          title: t('practice.boardSymmetry.title'),
          description: t('practice.boardSymmetry.description'),
          icon: '🦋',
          thumbnail: '/images/practice/board-symmetry.png',
        },
        {
          id: 'route-planner',
          title: t('practice.routePlanner.title'),
          description: t('practice.routePlanner.description'),
          icon: '📍',
          thumbnail: '/images/practice/route-planner.png',
        },
        {
          id: 'diagonal-quiz',
          title: t('practice.diagonalQuiz.title'),
          description: t('practice.diagonalQuiz.description'),
          icon: '↗️',
          thumbnail: '/images/practice/diagonal-quiz.png',
        },
      ],
    },
    {
      title: t('practice.levelAdvanced'),
      practices: [
        {
          id: 'position-memory',
          title: t('practice.positionMemory.title'),
          description: t('practice.positionMemory.description'),
          icon: '🧠',
          thumbnail: '/images/practice/position-memory.png',
        },
        {
          id: 'knight-tour',
          title: t('practice.knightTour.title'),
          description: t('practice.knightTour.description'),
          icon: '♞',
          thumbnail: '/images/practice/knight-tour.png',
        },
        {
          id: 'move-sequence',
          title: t('practice.moveSequence.title'),
          description: t('practice.moveSequence.description'),
          icon: '🥋',
          thumbnail: '/images/practice/move-sequence.png',
        },
      ],
    },
    {
      title: t('practice.levelIntroduction'),
      practices: [
        {
          id: 'algebraic-notation',
          title: t('practice.algebraicNotation.title'),
          description: t('practice.algebraicNotation.description'),
          icon: '🔤',
          thumbnail: '/images/practice/algebraic-notation.png',
        },
        {
          id: 'fen',
          title: t('practice.fen.title'),
          description: t('practice.fen.description'),
          icon: '📝',
          thumbnail: '/images/practice/fen.png',
        },
        {
          id: 'quadrants',
          title: t('practice.quadrantAnchors.title'),
          description: t('practice.quadrantAnchors.description'),
          icon: '⚃',
          thumbnail: '/images/practice/quadrants.png',
        },
      ],
    },
  ];

  const tabs = sections.map((section) => ({
    label: section.title,
    content: (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {section.practices.map((practice) => (
          <PracticeCard
            key={practice.id}
            href={`/practice/${practice.id}`}
            icon={practice.icon}
            title={practice.title}
            description={practice.description}
            thumbnail={practice.thumbnail}
            locale={locale}
          />
        ))}
      </div>
    ),
  }));

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
        <PracticeTabs tabs={tabs} />

        <Divider />

        <Breadcrumb items={[{ label: t('navigation.practice') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
