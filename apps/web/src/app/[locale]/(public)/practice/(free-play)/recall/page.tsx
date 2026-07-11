/**
 * Recall Page (感想戦)
 *
 * @description
 * A game review feature where users replay all moves from a completed game
 * from memory. This strengthens move recall and reinforces the mental model
 * of the game. Board display and move-input method can be adjusted mid-review
 * (seeded from the saved game's preferences); those edits are local to the
 * review session and are not persisted.
 *
 * @flow
 * 1. Setup Phase (this page): paste a PGN (or import from Lichess) and pick a color
 * 2. Session Phase (`/practice/recall/session`): enter each move from memory in order
 *    - Correct move: Advance to next move
 *    - Incorrect move: Shown as error, retry until correct
 *    - "I don't know" button: Reveals the correct move and advances
 *    - Auto-opponent mode: Only enter your own moves
 * 3. Completion: Summary of accuracy, option to review specific positions
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { HelpTourButton } from '@/app/[locale]/_components/HelpTourButton';
import type { HelpStep } from '@/app/[locale]/_components/HelpTourButton';
import { PageLayout } from '@/app/[locale]/_components/PageLayout';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { RecallSetupForm } from './_components/RecallSetupForm';

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  const title = t('recall.title');
  const description = t('recall.description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/recall', title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function RecallPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale });
  const tRecall = await getTranslations({ locale, namespace: 'recall' });

  const setupHelpSteps: HelpStep[] = [
    {
      targetId: 'recall-setup-pgn',
      title: tRecall('help.setup.pgn.title'),
      description: tRecall('help.setup.pgn.description'),
      side: 'bottom',
      align: 'start',
    },
    {
      targetId: 'recall-setup-color',
      title: tRecall('help.setup.color.title'),
      description: tRecall('help.setup.color.description'),
      side: 'top',
      align: 'center',
    },
  ];

  return (
    <PageLayout
      title={tRecall('title')}
      titleAction={<HelpTourButton steps={setupHelpSteps} label={tRecall('help.label')} />}
      locale={locale}
      breadcrumb={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: tRecall('title') },
      ]}
    >
      <RecallSetupForm />

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
