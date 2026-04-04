/**
 * Position Memory (ポジションの記憶)
 *
 * @description
 * A blindfold chess training mode where users memorize chess positions
 * and then recreate them from memory. This practice strengthens visual
 * memory and board visualization skills essential for blindfold chess.
 *
 * @flow
 * 1. Setup Phase (this page): Configure time limit, problem source
 *    (built-in or custom FEN), and shuffle option
 * 2. Session Phase: Memorize position → Recreate from memory → View accuracy result
 *    Repeat for each problem in the set
 */
import { getTranslations } from 'next-intl/server';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PositionMemoryPageContent } from './_components/PositionMemoryPageContent';
import { PositionMemorySetup } from './_components/PositionMemorySetup';
import { decodeFensFromBase64, isQueryTooLong, validateFEN } from './_lib/utils';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const title = t('practice.positionMemory.title');
  const description = t('practice.positionMemory.description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/position-memory', title, description }),
    title,
    description,
  };
}

export default async function PositionMemoryPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const search = await searchParams;
  const t = await getTranslations({ locale });

  // Parse query parameters for shared links
  let urlError: string | null = null;
  let urlFens: string[] | null = null;
  let urlTimeLimit: number | null = null;
  let urlShuffle: boolean | null = null;

  const problemsParam = search.problems;
  const timeLimitParam = search.timeLimit;
  const shuffleParam = search.shuffle;

  if (problemsParam && typeof problemsParam === 'string') {
    // Check if query is too long
    if (isQueryTooLong(problemsParam)) {
      urlError = 'url_too_long';
    } else {
      // Try to decode
      const decodedFens = decodeFensFromBase64(problemsParam);

      if (!decodedFens) {
        urlError = 'invalid_base64';
      } else {
        // Validate all FENs
        const invalidFens = decodedFens.filter((fen) => !validateFEN(fen));

        if (invalidFens.length > 0) {
          urlError = 'invalid_fen';
        } else {
          urlFens = decodedFens;

          // Parse other parameters
          if (timeLimitParam && typeof timeLimitParam === 'string') {
            const parsed = parseInt(timeLimitParam);
            if (!isNaN(parsed) && parsed >= 5 && parsed <= 60) {
              urlTimeLimit = parsed;
            }
          }

          if (shuffleParam && typeof shuffleParam === 'string') {
            urlShuffle = shuffleParam === '1';
          }
        }
      }
    }
  }

  // Determine if we should show setup page (URL has FEN param) or delegate to client
  const hasFenParam = problemsParam && typeof problemsParam === 'string';

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.positionMemory.title')}</PageTitle>

      <PagePanel>
        <SectionTitle>{t('practice.positionMemory.settings')}</SectionTitle>

        {hasFenParam ? (
          <PositionMemorySetup
            locale={locale}
            urlError={urlError}
            urlFens={urlFens}
            urlTimeLimit={urlTimeLimit}
            urlShuffle={urlShuffle}
          />
        ) : (
          <PositionMemoryPageContent locale={locale} />
        )}

        <Divider />

        <Breadcrumb
          items={[
            { label: t('navigation.practice'), href: '/practice' },
            { label: t('practice.positionMemory.title') },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
