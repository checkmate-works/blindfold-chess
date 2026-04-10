'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { useRouter } from '@/i18n/routing';

const MIN_TIME = 5;
const MAX_TIME = 60;
const DEFAULT_TIME_LIMIT = 30;

type Props = {
  positionId: string;
  locale: string;
};

export function PositionStartForm({ positionId, locale }: Props) {
  const [timeLimit, setTimeLimit] = useState(DEFAULT_TIME_LIMIT);
  const router = useRouter();
  const t = useTranslations('practice.positionMemory.detail');

  const handleStart = () => {
    router.push(`/practice/position-memory/${positionId}/session?timeLimit=${timeLimit}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t('timeLimit')}: {t('seconds', { count: timeLimit })}
        </label>
        <input
          type="range"
          min={MIN_TIME}
          max={MAX_TIME}
          step="5"
          value={timeLimit}
          onChange={(e) => setTimeLimit(Number(e.target.value))}
          className="w-full h-2 bg-secondary rounded-md appearance-none cursor-pointer accent-foreground"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{MIN_TIME}</span>
          <span>{MAX_TIME}</span>
        </div>
      </div>

      <Button onClick={handleStart} variant="primary" size="lg" fullWidth>
        {t('start')}
      </Button>

      <div className="text-center">
        <Link
          href="/practice/position-memory/tutorial"
          locale={locale}
          className="text-sm text-link-primary hover:underline"
        >
          {t('tutorialLink')}
        </Link>
      </div>
    </div>
  );
}
