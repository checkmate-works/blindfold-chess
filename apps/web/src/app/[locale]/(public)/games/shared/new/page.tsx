/**
 * Publish Shared Game (対局を公開)
 *
 * @description
 * Form page for publishing a finished blindfold game to the public catalog so
 * other users can give advice. The game itself lives in localStorage, so the
 * form is loaded client-side from `?gameId=`; submission goes through the
 * `publishGameAction` Server Action.
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PageLayout } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PublishGameClient } from './_components/PublishGameClient';

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'sharedGames' });
  const title = t('new.title');

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/shared/new', title }),
    title: resolveTitle(title, locale),
  };
}

export default async function PublishGamePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'sharedGames' });

  // Hierarchically the parent is the game being published — its result screen —
  // not the public catalog (the game isn't published yet).
  const gameIdRaw = (await searchParams).gameId;
  const gameId = typeof gameIdRaw === 'string' ? gameIdRaw : null;
  const tPlay = await getTranslations({ locale, namespace: 'play' });
  const breadcrumb = gameId
    ? [
        { label: tPlay('resultTitle'), href: `/games/play/result?gameId=${gameId}` },
        { label: t('new.title') },
      ]
    : [{ label: t('new.title') }];

  return (
    <PageLayout title={t('new.title')} locale={locale} breadcrumb={breadcrumb}>
      <PublishGameClient locale={locale} />
    </PageLayout>
  );
}
