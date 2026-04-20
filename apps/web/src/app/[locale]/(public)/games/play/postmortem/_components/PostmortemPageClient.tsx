'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

import { useSearchParams } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaQuestionCircle } from 'react-icons/fa';

import { Divider } from '@/app/[locale]/_components/Divider';
import { Modal } from '@/app/[locale]/_components/Modal';
import { PagePanel } from '@/app/[locale]/_components/PagePanel';
import { PageTitle } from '@/app/[locale]/_components/PageTitle';

import { PostmortemClient } from './PostmortemClient';

type Props = {
  breadcrumb: ReactNode;
};

export function PostmortemPageClient({ breadcrumb }: Props) {
  const searchParams = useSearchParams();
  const t = useTranslations('postmortem');
  const [showHelp, setShowHelp] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Get PGN from URL parameters
  const pgn = searchParams.get('pgn');
  const playerColor = (searchParams.get('color') as 'white' | 'black') || 'white';
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const startingFen = searchParams.get('fen') || undefined;

  if (!pgn) {
    return (
      <div className="text-center">
        <PageTitle>{t('title')}</PageTitle>
        <p className="text-muted-foreground mt-4">No game data provided.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-center gap-2">
        <PageTitle>{t('title')}</PageTitle>
        {hasStarted && (
          <button
            onClick={() => setShowHelp(true)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label={t('infoModalTitle')}
          >
            <FaQuestionCircle className="w-5 h-5" />
          </button>
        )}
      </div>
      <PagePanel>
        <PostmortemClient
          pgn={pgn}
          playerColor={playerColor}
          autoOpponent={false}
          initialOffset={offset}
          startingFen={startingFen}
          onStart={() => setHasStarted(true)}
        />
        <Divider />
        {breadcrumb}
      </PagePanel>

      {/* Help Modal */}
      <Modal isOpen={showHelp} title={t('infoModalTitle')} onClose={() => setShowHelp(false)}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{t('description')}</p>
          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
            <li>{t('guidanceStep1')}</li>
            <li>{t('guidanceStep2')}</li>
            <li>{t('guidanceStep3')}</li>
          </ol>
        </div>
      </Modal>
    </div>
  );
}
