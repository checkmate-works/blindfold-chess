'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { useRouter } from '@/i18n/routing';
import { FaPlay } from 'react-icons/fa';

import { SegmentedControl } from '@/app/[locale]/(public)/practice/_components/SegmentedControl';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';

import {
  DEFAULT_DISPLAY_MODE,
  DEFAULT_TIME_LIMIT,
  type DisplayMode,
  MAX_TIME_LIMIT,
  MIN_TIME_LIMIT,
} from '../../_lib/session-config';

type Props = {
  positionId: string;
  locale: string;
};

export function PositionStartForm({ positionId, locale }: Props) {
  const [timeLimit, setTimeLimit] = useState(DEFAULT_TIME_LIMIT);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(DEFAULT_DISPLAY_MODE);
  const router = useRouter();
  const t = useTranslations('practice.positionMemory.detail');

  const handleStart = () => {
    const params = new URLSearchParams({
      timeLimit: String(timeLimit),
      displayMode,
    });
    router.push(`/practice/position-memory/${positionId}/session?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">{t('displayMode')}</label>
        <SegmentedControl<DisplayMode>
          options={[
            { value: 'board', label: t('displayModeBoard') },
            { value: 'text', label: t('displayModeText') },
          ]}
          value={displayMode}
          onChange={setDisplayMode}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t('timeLimit')}: {t('seconds', { count: timeLimit })}
        </label>
        <input
          type="range"
          min={MIN_TIME_LIMIT}
          max={MAX_TIME_LIMIT}
          step="5"
          value={timeLimit}
          onChange={(e) => setTimeLimit(Number(e.target.value))}
          className="w-full h-2 bg-secondary rounded-md appearance-none cursor-pointer accent-foreground"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{MIN_TIME_LIMIT}</span>
          <span>{MAX_TIME_LIMIT}</span>
        </div>
      </div>

      <Button onClick={handleStart} variant="primary" size="lg" icon={<FaPlay />} fullWidth>
        {t('start')}
      </Button>

      <div className="text-center">
        <Link
          href="/practice/position-memory/tutorial"
          locale={locale}
          className={`text-sm ${TEXT_LINK_CLASSES}`}
        >
          {t('tutorialLink')}
        </Link>
      </div>
    </div>
  );
}
