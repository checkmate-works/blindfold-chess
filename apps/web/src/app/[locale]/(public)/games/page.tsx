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

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';

import { NewGameButton } from '@/app/[locale]/(public)/(home)/_components/NewGameButton';
import { HelpTourButton, PageLayout, SectionTitle } from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GamesPageClient } from './_components';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'metadata.games' });

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'games', title, description }),
    title: resolveTitle(title, locale),
    description,
    robots: { index: false },
  };
}

export default async function GamesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'gamesPage' });
  const tHelp = await getTranslations({ locale, namespace: 'gamesPage.help' });
  const tGameList = await getTranslations({ locale, namespace: 'home.gameList' });

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
      <SectionTitle>{tGameList('title')}</SectionTitle>
      <div data-tour-id="games-new-button">
        <NewGameButton locale={locale} />
      </div>
      <GamesPageClient locale={locale} />

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}
    </PageLayout>
  );
}
