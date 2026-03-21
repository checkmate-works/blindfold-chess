'use client';

import { useState } from 'react';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { PracticeMode } from '../_lib/types';
import { SquareColorsSetup } from './SquareColorsSetup';

type Props = {
  locale: Locale;
  initialMode?: PracticeMode;
};

export default function SquareColors({ locale, initialMode = 'training' }: Props) {
  const [mode, setMode] = useState<PracticeMode>(initialMode);

  return <SquareColorsSetup locale={locale} mode={mode} onModeChange={setMode} />;
}
