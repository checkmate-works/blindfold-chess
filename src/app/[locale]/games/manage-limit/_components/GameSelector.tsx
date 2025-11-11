'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { FaCheck } from 'react-icons/fa';

import type { Game } from '@/lib/types';

import { formatLastMove } from '@/app/[locale]/(home)/_lib/utils';
import { ColorIcon } from '@/app/[locale]/_components/ColorIcon';

type Props = {
  games: Game[];
  onDeleteAndSave: (gameIdsToDelete: string[]) => Promise<void>;
  onSkipSave: () => void;
  isProcessing: boolean;
};

export function GameSelector({ games, onDeleteAndSave, onSkipSave, isProcessing }: Props) {
  const t = useTranslations('home.manageLimit');
  const tGameList = useTranslations('home.gameList');
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());

  const handleToggleGame = (gameId: string) => {
    const newSelection = new Set(selectedGameIds);
    if (newSelection.has(gameId)) {
      newSelection.delete(gameId);
    } else {
      newSelection.add(gameId);
    }
    setSelectedGameIds(newSelection);
  };

  const handleDeleteAndSave = async () => {
    if (selectedGameIds.size === 0) return;
    await onDeleteAndSave(Array.from(selectedGameIds));
  };

  const getStatusStyles = (status: Game['status']) => {
    switch (status) {
      case 'win':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'loss':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'draw':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const getStatusIcon = (status: Game['status']) => {
    switch (status) {
      case 'win':
        return '✓';
      case 'loss':
        return '✗';
      case 'draw':
        return '=';
      default:
        return '⏸';
    }
  };

  const getStatusText = (status: Game['status']) => {
    switch (status) {
      case 'win':
        return tGameList('win');
      case 'loss':
        return tGameList('loss');
      case 'draw':
        return tGameList('draw');
      default:
        return tGameList('inProgress');
    }
  };

  return (
    <div className="space-y-6">
      {/* Game List */}
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <ul className="divide-y divide-border">
          {games.map((game) => {
            const isSelected = selectedGameIds.has(game.id);
            return (
              <li
                key={game.id}
                className={`transition-all duration-200 cursor-pointer ${
                  isSelected ? 'bg-muted' : 'hover:bg-muted/50'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !isProcessing && handleToggleGame(game.id)}
              >
                <div className="px-4 sm:px-6 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                          isSelected ? 'bg-foreground border-foreground' : 'border-muted-foreground'
                        }`}
                      >
                        {isSelected && <FaCheck className="w-3 h-3 text-background" />}
                      </div>

                      {/* Status Icon */}
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-base flex-shrink-0 ${getStatusStyles(
                          game.status
                        )}`}
                        title={getStatusText(game.status)}
                      >
                        {getStatusIcon(game.status)}
                      </span>

                      {/* Game Info */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center" title={game.playerColor}>
                          <ColorIcon color={game.playerColor} />
                        </div>

                        <span className="font-medium font-mono">
                          {formatLastMove(game.moves, game.playerColor)}
                        </span>

                        <span className="font-medium">
                          {tGameList('level')} {game.skillLevel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Selection Info */}
      {selectedGameIds.size > 0 && (
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-sm text-foreground">
            {t('selectedCount', { count: selectedGameIds.size })}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleDeleteAndSave}
          disabled={selectedGameIds.size === 0 || isProcessing}
          className="flex-1 px-6 py-3 bg-foreground text-background rounded-md hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <span className="animate-spin">⏳</span>
              {t('processing')}
            </>
          ) : (
            <>{t('deleteAndSave')}</>
          )}
        </button>
        <button
          onClick={onSkipSave}
          disabled={isProcessing}
          className="sm:w-auto px-6 py-3 border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {t('skipSave')}
        </button>
      </div>
    </div>
  );
}
