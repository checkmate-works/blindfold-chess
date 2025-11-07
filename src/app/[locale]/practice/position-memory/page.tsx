import { getTranslations } from 'next-intl/server';

import { Breadcrumb, Divider, PageDescription, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PositionMemorySetup } from './_components/PositionMemorySetup';
import { decodeFensFromBase64, getMaxProblems, isQueryTooLong, validateFEN } from './_lib/utils';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/position-memory' }),
    title: t('practice.positionMemory.title'),
    description: t('practice.positionMemory.description'),
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

  const problemsParam = search.p;
  const timeLimitParam = search.t;
  const shuffleParam = search.s;

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

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.positionMemory.title')}</PageTitle>

      <PageDescription>{t('practice.positionMemory.description')}</PageDescription>

      <PositionMemorySetup
        locale={locale}
        urlError={urlError}
        urlFens={urlFens}
        urlTimeLimit={urlTimeLimit}
        urlShuffle={urlShuffle}
        maxProblems={getMaxProblems()}
      />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.positionMemory.title') },
        ]}
        locale={locale}
      />
    </div>
  );
}
