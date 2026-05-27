/**
 * Instant ("custom") position-memory problem — start page.
 *
 * @description
 * Mirrors the saved-position detail/start page (`[id]/page.tsx`) but for a
 * problem whose FEN is encoded in the URL token rather than stored in the DB.
 * No author, no comments, no EXP — just a board preview and the start form.
 *
 * @flow
 * 1. Decode + validate the Base64URL FEN token (404 on malformed input).
 * 2. Render the board preview and the shared start form, pointing it at the
 *    custom session route.
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

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

  return (
    <PageLayout
      title={t('custom.title')}
      locale={locale}
      breadcrumb={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('list.title'), href: '/practice/position-memory' },
        { label: t('custom.title') },
      ]}
    >
      <div className="my-6 max-w-md mx-auto">
        <PositionDetailBoard fen={problem.fen} flipped={problem.isBlackToMove} />
      </div>

      <SectionTitle>{t('detail.start')}</SectionTitle>
      <div className="mt-4">
        <PositionStartForm
          sessionPath={`/practice/position-memory/custom/${token}/session`}
          locale={locale}
        />
      </div>
    </PageLayout>
  );
}
