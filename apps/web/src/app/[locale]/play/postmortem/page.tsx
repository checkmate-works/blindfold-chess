/**
 * Postmortem Page (感想戦)
 *
 * @description
 * A game review feature where users replay all moves from a completed game
 * from memory. This strengthens move recall and reinforces the mental model
 * of the game. Optionally provides Stockfish evaluation for each move.
 *
 * @flow
 * 1. Entry: Navigate from completed game with PGN passed via URL params
 * 2. Replay Phase: Enter each move from memory in order
 *    - Correct move: Advance to next move (with optional evaluation)
 *    - Incorrect move: Shown as error, retry until correct
 *    - "I don't know" button: Reveals the correct move and advances
 *    - Auto-opponent mode: Only enter your own moves
 * 3. Completion: Summary of accuracy, option to review specific positions
 */
'use client';

import { type ReactElement, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';

import { InfoModal } from '@/app/_components';
import { FaInfoCircle } from 'react-icons/fa';

import { Divider } from '@/app/[locale]/_components/Divider';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PageTitle } from '../../_components/PageTitle';
import { ClientBreadcrumb } from '../_components/ClientBreadcrumb';
import { PostmortemClient } from './_components/PostmortemClient';

export default function PostmortemPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as Locale;
  const t = useTranslations('postmortem');
  const tPlay = useTranslations('play');
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedMoveDisplay, setSelectedMoveDisplay] = useState<ReactElement | null>(null);

  // Get PGN from URL parameters
  const pgn = searchParams.get('pgn');
  const playerColor = (searchParams.get('color') as 'white' | 'black') || 'white';
  const autoOpponent = searchParams.get('autoOpponent') === 'true';
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const gameId = searchParams.get('gameId');
  const skillLevel = searchParams.get('skillLevel');
  const moves = searchParams.get('moves');

  // Build the play page URL with original game parameters
  const getPlayPageUrl = () => {
    const params = new URLSearchParams();
    params.set('color', playerColor);

    if (gameId) {
      params.set('gameId', gameId);
    }
    if (skillLevel) {
      params.set('skillLevel', skillLevel);
    }
    if (moves) {
      params.set('moves', moves);
    }

    return `/play?${params.toString()}`;
  };

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
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <PageTitle>{selectedMoveDisplay || t('title')}</PageTitle>
          {!selectedMoveDisplay && (
            <button
              onClick={() => setIsInfoModalOpen(true)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label="Information"
            >
              <FaInfoCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      <PostmortemClient
        pgn={pgn}
        playerColor={playerColor}
        autoOpponent={autoOpponent}
        initialOffset={offset}
        onSelectedMoveChange={setSelectedMoveDisplay}
      />
      <Divider />
      <ClientBreadcrumb
        items={[{ label: tPlay('title'), href: getPlayPageUrl() }, { label: t('title') }]}
        locale={locale}
      />
      <InfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        title={t('infoModalTitle')}
      >
        <p>{t('description')}</p>
      </InfoModal>
    </div>
  );
}
