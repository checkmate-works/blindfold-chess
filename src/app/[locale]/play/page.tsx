'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

import { PageTitle } from '../_components/PageTitle';
import type { Locale } from '../_lib/types';
import { PlayClient } from './_components/PlayClient';

export default function PlayPage() {
  const params = useParams();
  const locale = params.locale as Locale;
  const t = useTranslations('play');
  const [aiMoveDisplay, setAiMoveDisplay] = useState<string | null>(null);

  return (
    <>
      <div className="mb-8">
        <PageTitle>{aiMoveDisplay || t('title')}</PageTitle>
      </div>
      <PlayClient locale={locale} onAiMoveChange={setAiMoveDisplay} />
    </>
  );
}
