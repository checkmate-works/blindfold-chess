'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { PracticePanel } from '@/app/[locale]/(public)/practice/_components/PracticePanel';
import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

export function SquareColorsSetup({ locale }: Props) {
  const t = useTranslations('practice.squareColors');
  const tp = useTranslations('practice');
  const router = useRouter();

  const handleStart = () => {
    router.push(`/${locale}/practice/square-colors/training#square-colors-training-session`);
  };

  return (
    <div>
      <PracticePanel className="p-6">
        <SectionTitle className="mb-4">{t('settings')}</SectionTitle>

        <div className="mb-6">
          <p className="text-sm text-muted-foreground">{tp('trainingDescription')}</p>
        </div>

        <Button
          onClick={handleStart}
          variant="primary"
          size="lg"
          icon={<FaPlay />}
          className="w-full"
        >
          {tp('startTraining')}
        </Button>
      </PracticePanel>

      <PracticePanel className="mt-8 p-6 space-y-3">
        <SectionTitle>{t('requiredKnowledge')}</SectionTitle>
        <CardLink
          href="/learn/coordinates/square-colors"
          icon="🎨"
          title={t('viewArticle')}
          description={t('articleDescription')}
          locale={locale}
        />
      </PracticePanel>
    </div>
  );
}
