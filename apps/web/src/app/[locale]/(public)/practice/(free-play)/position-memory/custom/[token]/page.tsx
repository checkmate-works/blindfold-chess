/**
 * Instant ("custom") position-memory problem — start page.
 *
 * @description
 * Mirrors the saved-position detail/start page (`[id]/page.tsx`) but for a
 * problem whose FEN is encoded in the URL token rather than stored in the DB.
 * No author, no comments, no EXP — just the shared position-detail shell with
 * a board preview and the start form.
 *
 * @flow
 * 1. Decode + validate the Base64URL FEN token (404 on malformed input).
 * 2. Render the shared `PositionDetailLayout` (same "Position Description" /
 *    board / "Solve the Problem" structure as the saved-position page),
 *    pointing the start form at the custom session route.
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { FaPlusCircle } from 'react-icons/fa';

import { Divider, SectionTitle } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PositionDetailLayout } from '../../../_components/PositionDetailLayout';
import { PositionDetailBoard } from '../../_components/single-position/PositionDetailBoard';
import { PositionStartForm } from '../../_components/single-position/PositionStartForm';
import { resolveCustomProblem } from '../../_lib/custom-problem';

type Props = {
  params: Promise<{
    locale: Locale;
    token: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });

  return {
    title: resolveTitle(`${t('title')} - ${t('custom.title')}`, locale),
    // Instant problems live in an unbounded URL space — keep them out of the index.
    robots: { index: false, follow: false },
  };
}

export default async function CustomPositionStartPage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const problem = resolveCustomProblem(token);
  if (!problem) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });
  const tPlay = await getTranslations({ locale, namespace: 'play' });
  const tPractice = await getTranslations({ locale, namespace: 'practice' });

  return (
    <PositionDetailLayout
      title={t('custom.title')}
      locale={locale}
      bottomAdSense={<AdSlot slot="content-bottom" />}
      breadcrumbItems={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('list.title'), href: '/practice/position-memory' },
        { label: t('custom.title') },
      ]}
    >
      <SectionTitle>{t('detail.descriptionSection')}</SectionTitle>

      <div className="max-w-md mx-auto">
        <PositionDetailBoard fen={problem.fen} flipped={problem.isBlackToMove} />
      </div>

      {/* Same primary / "or" / alternative shape as the saved-position and
          puzzle detail pages: memorizing leads, "new game from here" is the
          alternative below the divider. */}
      <SectionTitle>{t('detail.solveSection')}</SectionTitle>

      <PositionStartForm
        sessionPath={`/practice/position-memory/custom/${token}/session`}
        locale={locale}
      />

      <div className="my-6 mx-auto flex w-4/5 items-center gap-4">
        <Divider className="flex-1" />
        <span className="text-sm text-muted-foreground">{tPractice('orDivider')}</span>
        <Divider className="flex-1" />
      </div>

      <Link href={`/games/new/position?fen=${encodeURIComponent(problem.fen)}`}>
        <Button asChild variant="secondary" size="lg" icon={<FaPlusCircle />} fullWidth>
          {tPlay('newGameFromHere')}
        </Button>
      </Link>
    </PositionDetailLayout>
  );
}
