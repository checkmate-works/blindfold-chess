'use client';

import { useMemo } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { PracticeLayout } from '@/app/[locale]/(public)/practice/_components/PracticeLayout';
import { createPracticeResultClient } from '@/app/[locale]/(public)/practice/_lib/createPracticeResultClient';
import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { MoveSequenceResult } from '../_components/MoveSequenceResult';
import { encodeMoveSequenceToBase64 } from '../_lib/share';
import type { MoveSequenceSessionResult } from '../_lib/types';

function MoveSequenceContent({ locale, adBanner }: { locale: Locale; adBanner?: React.ReactNode }) {
  const tPractice = useTranslations('practice');
  const router = useRouter();
  const searchParams = useSearchParams();

  const dataParam = searchParams.get('data');
  const modeParam = searchParams.get('mode');
  const settingsParam = searchParams.get('settings');
  const isTutorial = modeParam === 'tutorial';

  const result = useMemo<MoveSequenceSessionResult | null>(() => {
    if (!dataParam) return null;
    try {
      return JSON.parse(decodeURIComponent(dataParam));
    } catch {
      return null;
    }
  }, [dataParam]);

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
    return null;
  }

  return (
    <>
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
    </>
  );
}

export const ResultClient = createPracticeResultClient({
  moduleSlug: 'move-sequence',
  i18nKey: 'moveSequence',
  renderContent: (ctx, adBanner) => <MoveSequenceContent locale={ctx.locale} adBanner={adBanner} />,
});
