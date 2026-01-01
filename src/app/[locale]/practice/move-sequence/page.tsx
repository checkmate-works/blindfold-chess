/**
 * Yakusoku Kumite - Move Sequence Practice (約束組手)
 *
 * @description
 * Practice memorizing and reproducing chess move sequences.
 * Users input a FEN position and a series of moves, watch the sequence play out,
 * then reproduce the moves from memory.
 *
 * @flow
 * 1. Setup Phase: Input FEN and PGN moves
 * 2. Memorize Phase: Watch the sequence play on the board
 * 3. Recall Phase: Input moves from memory
 * 4. Result Phase: View accuracy and statistics
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Breadcrumb, Divider, PageDescription, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import MoveSequence from './_components/MoveSequence';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/move-sequence' }),
    title: t('practice.moveSequence.title'),
    description: t('practice.moveSequence.description'),
  };
}

export default async function MoveSequencePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.moveSequence.title')}</PageTitle>

      <PageDescription>{t('practice.moveSequence.description')}</PageDescription>

      <MoveSequence />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.moveSequence.title') },
        ]}
        locale={locale}
      />
    </div>
  );
}
