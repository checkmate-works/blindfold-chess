'use client';

import { useMemo } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import { PracticeLayout } from '@/app/[locale]/(public)/practice/_components/PracticeLayout';
import { PracticeResultPage } from '@/app/[locale]/(public)/practice/_components/PracticeResultPage';
import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { MoveSequenceResult } from '../_components/MoveSequenceResult';
import { encodeMoveSequenceToBase64 } from '../_lib/share';
import type { MoveSequenceSessionResult } from '../_lib/types';

type Props = {
  locale: Locale;
  adBanner?: React.ReactNode;
};

export function ResultClient({ locale, adBanner }: Props) {
  const t = useTranslations('practice.moveSequence');
  const tPractice = useTranslations('practice');
  const router = useRouter();
  const searchParams = useSearchParams();

  const dataParam = searchParams.get('data');
  const modeParam = searchParams.get('mode');
  const settingsParam = searchParams.get('settings');
  const isTutorial = modeParam === 'tutorial';

  // Parse Results
  const result = useMemo<MoveSequenceSessionResult | null>(() => {
    if (!dataParam) return null;
    try {
      return JSON.parse(decodeURIComponent(dataParam));
    } catch {
      return null;
    }
  }, [dataParam]);

  // Parse Settings for Restart
  const settings = useMemo(() => {
    if (!settingsParam) return null;
    try {
      return JSON.parse(decodeURIComponent(settingsParam));
    } catch {
      return null;
    }
  }, [settingsParam]);

  const handleTryAgain = () => {
    if (isTutorial) {
      router.push(`/${locale}/practice/move-sequence?mode=tutorial`);
    } else if (settings && settings.fen && settings.pgn) {
      const params = new URLSearchParams();

      // Encode FEN and PGN into 'data' param
      const encodedData = encodeMoveSequenceToBase64(settings.fen, settings.pgn);
      params.set('data', encodedData);

      if (settings.includeOpponentMoves) params.set('includeOpponentMoves', '1');
      if (settings.skipMemorize) params.set('skipMemorize', '1');

      router.push(`/${locale}/practice/move-sequence/session?${params.toString()}`);
    } else {
      router.push(`/${locale}/practice/move-sequence`);
    }
  };

  const handleFinishTutorial = () => {
    router.push(`/${locale}/practice/move-sequence`);
  };

  const handleChangeSettings = () => {
    router.push(`/${locale}/practice/move-sequence`);
  };

  /* TODO: Add related learning links when available */
  const relatedLinks: Array<{
    href: string;
    icon: string;
    title: string;
    description: string;
  }> = [];

  if (!result) {
    return null; // Or some error state
  }

  return (
    <PracticeResultPage
      locale={locale}
      title={t('title')}
      breadcrumbItems={[
        { label: tPractice('title'), href: '/practice' },
        { label: t('title'), href: '/practice/move-sequence' },
        { label: tPractice('result') },
      ]}
    >
      <MoveSequenceResult
        result={result}
        isTutorial={isTutorial}
        onTryAgain={handleTryAgain}
        onChangeSettings={handleChangeSettings}
        onFinishTutorial={handleFinishTutorial}
      />

      {adBanner}

      {relatedLinks.length > 0 && !isTutorial && (
        <PracticeLayout>
          <SectionTitle className="text-xl font-semibold mb-4">
            {tPractice('relatedLearning')}
          </SectionTitle>
          {/* Placeholder for related learning if keys exist, otherwise hidden or generic */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedLinks.map((link) => (
              <CardLink
                key={link.href}
                href={link.href}
                icon={link.icon}
                title={link.title}
                description={link.description}
                locale={locale}
              />
            ))}
          </div>
        </PracticeLayout>
      )}
    </PracticeResultPage>
  );
}
