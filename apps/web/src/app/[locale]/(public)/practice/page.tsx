import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ChallengeCard } from '@/app/_components';
import { SITE_URL } from '@/config';

import { JsonLd, generateItemListSchema } from '@/lib/jsonld';

import {
  DashboardCard,
  DashboardSection,
  DashboardSectionHeader,
  Divider,
  PagePanel,
  PageTitle,
} from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
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
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice' }),
    title: t('practice.title'),
    description: t('practice.description'),
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
        { id: 'square-colors', title: t('practice.squareColors.title'), icon: '🎨' },
        { id: 'coordinate-quiz', title: t('practice.coordinateQuiz.title'), icon: '🎯' },
        { id: 'legal-moves', title: t('practice.legalMoves.title'), icon: '♟️' },
      ],
    },
    {
      title: t('practice.levelIntermediate'),
      sectionIcon: '📚',
      practices: [
        { id: 'diagonal-quiz', title: t('practice.diagonalQuiz.title'), icon: '↗️' },
        { id: 'route-planner', title: t('practice.routePlanner.title'), icon: '📍' },
        { id: 'board-symmetry', title: t('practice.boardSymmetry.title'), icon: '🦋' },
      ],
    },
    {
      title: t('practice.levelAdvanced'),
      sectionIcon: '🎓',
      practices: [
        { id: 'position-memory', title: t('practice.positionMemory.title'), icon: '🧠' },
        { id: 'knight-tour', title: t('practice.knightTour.title'), icon: '♞' },
        { id: 'move-sequence', title: t('practice.moveSequence.title'), icon: '🥋' },
      ],
    },
    {
      title: t('practice.levelIntroduction'),
      sectionIcon: '📖',
      practices: [
        { id: 'algebraic-notation', title: t('practice.algebraicNotation.title'), icon: '🔤' },
        { id: 'fen', title: t('practice.fen.title'), icon: '📝' },
        { id: 'quadrants', title: t('practice.quadrantAnchors.title'), icon: '⚃' },
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

        <Divider />

        <Breadcrumb items={[{ label: t('navigation.practice') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
