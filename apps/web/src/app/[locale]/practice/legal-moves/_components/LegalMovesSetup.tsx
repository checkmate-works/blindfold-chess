'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import type { BoardTheme } from '@/lib/boardThemes';
import { DEFAULT_BOARD_THEME } from '@/lib/boardThemes';

import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { PieceType } from '../_lib/types';
import { LegalMovesSettings } from './LegalMovesSettings';

type Props = {
  locale: Locale;
  timeLimit: number;
  selectedPieces: Record<PieceType, boolean>;
  onTimeLimitChange: (value: number) => void;
  onPieceToggle: (piece: PieceType) => void;
  boardTheme?: BoardTheme;
};

export function LegalMovesSetup({
  locale,
  timeLimit,
  selectedPieces,
  onTimeLimitChange,
  onPieceToggle,
  boardTheme = DEFAULT_BOARD_THEME,
}: Props) {
  const t = useTranslations('practice.legalMoves');
  const router = useRouter();

  const hasSelectedPieces = Object.values(selectedPieces).some((selected) => selected);

  const handleStart = () => {
    const selectedPieceTypes = Object.entries(selectedPieces)
      .filter(([, selected]) => selected)
      .map(([piece]) => piece)
      .join(',');

    router.push(
      `/${locale}/practice/legal-moves/session?timeLimit=${timeLimit}&pieces=${selectedPieceTypes}#legal-moves-session`
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mb-8">
        <SectionTitle className="text-xl mb-4">{t('settings')}</SectionTitle>

        <LegalMovesSettings
          timeLimit={timeLimit}
          selectedPieces={selectedPieces}
          onTimeLimitChange={onTimeLimitChange}
          onPieceToggle={onPieceToggle}
          boardTheme={boardTheme}
        />

        <Button
          onClick={handleStart}
          disabled={!hasSelectedPieces}
          variant="primary"
          size="lg"
          className="w-full mt-6"
          icon={<FaPlay />}
        >
          {t('start')}
        </Button>
      </div>

      <div className="space-y-4">
        <SectionTitle>{t('relatedArticles')}</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CardLink
            href="/learn/moves/king-movement"
            icon="♔"
            title={t('articles.king.title')}
            description={t('articles.king.description')}
            locale={locale}
          />
          <CardLink
            href="/learn/moves/knight-movement"
            icon="♘"
            title={t('articles.knight.title')}
            description={t('articles.knight.description')}
            locale={locale}
          />
          <CardLink
            href="/learn/moves/rook-movement"
            icon="♜"
            title={t('articles.rook.title')}
            description={t('articles.rook.description')}
            locale={locale}
          />
          <CardLink
            href="/learn/moves/bishop-movement"
            icon="♗"
            title={t('articles.bishop.title')}
            description={t('articles.bishop.description')}
            locale={locale}
          />
        </div>
      </div>
    </div>
  );
}
