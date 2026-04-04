/**
 * Yakusoku Kumite - Move Sequence Practice (約束組手)
 *
 * @description
 * Practice memorizing and reproducing chess move sequences.
 * Users input a FEN position and a series of moves, watch the sequence play out,
 * then reproduce the moves from memory.
 *
 * @naming
 * The feature name "Yakusoku Kumite" (約束組手) is intentionally kept in romanized Japanese
 * across all locales, including English. This is a deliberate branding decision — the Japanese
 * name has proven to attract international users' curiosity and engagement.
 * Do NOT "correct" this to a plain English translation like "Move Sequence".
 *
 * @flow
 * 1. Setup Phase: Input FEN and PGN moves
 * 2. Memorize Phase: Watch the sequence play on the board
 * 3. Recall Phase: Input moves from memory
 * 4. Result Phase: View accuracy and statistics
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { MoveSequencePageContent } from './_components/MoveSequencePageContent';
import { decodeMoveSequenceFromBase64, isQueryTooLong, validateFEN } from './_lib/share';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const title = t('practice.moveSequence.title');
  const description = t('practice.moveSequence.description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/move-sequence', title, description }),
    title,
    description,
  };
}

export default async function MoveSequencePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const search = await searchParams;
  const t = await getTranslations({ locale });

  // Parse query parameters for shared links
  let urlError: string | null = null;
  let urlFen: string | null = null;
  let urlPgn: string | null = null;

  const dataParam = search.data;

  if (dataParam && typeof dataParam === 'string') {
    // Check if query is too long
    if (isQueryTooLong(dataParam)) {
      urlError = 'url_too_long';
    } else {
      // Try to decode
      const decoded = decodeMoveSequenceFromBase64(dataParam);

      if (!decoded) {
        urlError = 'invalid_data';
      } else {
        // Validate FEN
        if (!validateFEN(decoded.fen)) {
          urlError = 'invalid_fen';
        } else {
          urlFen = decoded.fen;
          urlPgn = decoded.pgn;
        }
      }
    }
  }

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.moveSequence.title')}</PageTitle>

      <PagePanel>
        <MoveSequencePageContent
          locale={locale}
          urlFen={urlFen}
          urlPgn={urlPgn}
          urlError={urlError}
        />

        <Divider />

        <Breadcrumb
          items={[
            { label: t('navigation.practice'), href: '/practice' },
            { label: t('practice.moveSequence.title') },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
