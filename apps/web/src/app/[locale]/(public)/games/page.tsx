/**
 * Games Page
 *
 * @description
 * Displays the full list of saved blindfold chess games with sorting
 * and bulk deletion capabilities. Limited to 20 games maximum.
 *
 * @flow
 * - Sort: Change display order by last played or creation date
 * - Game List: View, resume, or delete past games stored in localStorage
 * - Bulk Delete: Navigate to bulk deletion page for mass cleanup
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { HelpTourButton, PageLayout } from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GamesPageClient } from './_components';
import { GamesTabs } from './_components/GamesTabs';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'metadata.games', path: 'games' });
}

export default async function GamesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'gamesPage' });
  const tHelp = await getTranslations({ locale, namespace: 'gamesPage.help' });

  const helpSteps: HelpStep[] = [
    {
      targetId: 'games-new-button',
      title: tHelp('newGame.title'),
      description: tHelp('newGame.description'),
      side: 'bottom',
      align: 'start',
    },
    {
      targetId: 'games-list',
      title: tHelp('autoSave.title'),
      description: tHelp.markup('autoSave.description', {
        link: (chunks) =>
          `<a href="/${locale}/manual/data-handling-caution" class="underline">${chunks}</a>`,
      }),
      side: 'top',
      align: 'start',
    },
    {
      targetId: 'games-bulk-delete',
      title: tHelp('bulkDelete.title'),
      description: tHelp('bulkDelete.description'),
      side: 'top',
      align: 'end',
    },
  ];

  return (
    <PageLayout
      title={t('pageTitle')}
      titleAction={<HelpTourButton steps={helpSteps} label={tHelp('label')} />}
      locale={locale}
      breadcrumb={[{ label: t('pageTitle'), href: undefined }]}
    >
      <div className="mb-6">
        <GamesTabs active="mine" locale={locale} />
      </div>
      {/*
       * The mine tab's game count lives in localStorage, so the "show only
       * when non-empty" decision has to happen client-side. Hand the ad down
       * as a node and let GamesPageClient place it above the sort control,
       * gated on the same `games.length > 0` condition as the sort button.
       */}
      <GamesPageClient locale={locale} middleAd={<AdSlot slot="content-middle" />} />

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
