'use client';

import { useState } from 'react';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { PracticeMode } from '../_lib/types';
import { SquareColorsSetup } from './SquareColorsSetup';

type Props = {
  locale: Locale;
};

export default function SquareColors({ locale }: Props) {
  const [mode, setMode] = useState<PracticeMode>('training');

  return <SquareColorsSetup locale={locale} mode={mode} onModeChange={setMode} />;
}
