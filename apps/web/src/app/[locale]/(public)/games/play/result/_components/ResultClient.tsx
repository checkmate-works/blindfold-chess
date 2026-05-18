'use client';

import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaChartLine, FaClipboardList, FaMinus, FaTimes } from 'react-icons/fa';

import { engineConfigToUrlParams } from '@/lib/engines';
import type { Game, MoveInputMethod, MoveOperationLog } from '@/lib/games/saved-game-types';

import { Divider } from '@/app/[locale]/_components/Divider';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import { OperationLogModal } from '../../_components/OperationLogModal';
import { useNotation } from '../../_hooks';
import type { FormattedPgnMove } from '../../_lib';
import { useLoadGame } from '../_hooks/useLoadGame';
import { VictoryCertificate } from './VictoryCertificate';

type Props = {
  locale: Locale;
  displayName: string;
  breadcrumb: ReactNode;
};

export function ResultClient({ locale, displayName, breadcrumb }: Props) {
  const t = useTranslations('play');
  const searchParams = useSearchParams();
  const gameId = searchParams.get('gameId');
  const loadState = useLoadGame(gameId);

  if (loadState.status === 'idle' || loadState.status === 'loading') {
    return null;
  }

  if (loadState.status === 'error') {
    const message =
      loadState.error === 'missing-id' ? t('result.gameIdMissing') : t('result.gameNotFound');
    return (
      <div className="text-center">
        <p className="text-muted-foreground mt-4">{message}</p>
      </div>
    );
  }

  // gameId is guaranteed non-null when status === 'loaded'.
  return (
    <ResultContent
      game={loadState.game}
      gameId={gameId as string}
      locale={locale}
      displayName={displayName}
      breadcrumb={breadcrumb}
    />
  );
}

type ResultContentProps = {
  game: Game;
  gameId: string;
  locale: Locale;
  displayName: string;
  breadcrumb: ReactNode;
};

function OperationLogSummary({
  logs,
  onViewDetails,
}: {
  logs: MoveOperationLog[];
  onViewDetails: () => void;
}) {
  const t = useTranslations('play');

  const stats = useMemo(() => {
    const inputMethods: Record<MoveInputMethod, number> = {
      text: 0,
      'text-autocomplete': 0,
      select: 0,
      button: 0,
    };
    let totalPeeks = 0;
    let totalUndos = 0;
    let totalHints = 0;

    for (const log of logs) {
      inputMethods[log.inputMethod]++;
      totalPeeks += log.peekCount;
      totalUndos += log.undoCount;
      totalHints += log.movePeekCount ?? 0;
    }

    return { inputMethods, totalPeeks, totalUndos, totalHints };
  }, [logs]);

  const inputMethodLabels: Record<MoveInputMethod, string> = {
    text: t('operationLog.inputMethodText'),
    'text-autocomplete': t('operationLog.inputMethodTextAutocomplete'),
    select: t('operationLog.inputMethodSelect'),
    button: t('operationLog.inputMethodButton'),
  };

  const activeInputMethods = (
    Object.entries(stats.inputMethods) as [MoveInputMethod, number][]
  ).filter(([, count]) => count > 0);

  const hasAnyStats =
    activeInputMethods.length > 0 ||
    stats.totalPeeks > 0 ||
    stats.totalUndos > 0 ||
    stats.totalHints > 0;

  if (!hasAnyStats) return null;

  const singleRows: { label: string; value: string }[] = [];

  if (stats.totalHints > 0) {
    singleRows.push({
      label: t('result.operationSummary.hintCount'),
      value: t('result.operationSummary.times', { count: stats.totalHints }),
    });
  }

  if (stats.totalPeeks > 0) {
    singleRows.push({
      label: t('result.operationSummary.peekCount'),
      value: t('result.operationSummary.times', { count: stats.totalPeeks }),
    });
  }

  if (stats.totalUndos > 0) {
    singleRows.push({
      label: t('result.operationSummary.undoCount'),
      value: t('result.operationSummary.times', { count: stats.totalUndos }),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <FaClipboardList className="w-3.5 h-3.5" />
        <span>{t('result.operationSummary.title')}</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-accent">
            <tr>
              <th className="text-left px-4 py-3 font-medium">
                {t('result.operationSummary.columnItem')}
              </th>
              <th className="text-left px-4 py-3 font-medium">
                {t('result.operationSummary.columnDetail')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-card">
            {/* Input methods with rowspan */}
            {activeInputMethods.length > 0 &&
              activeInputMethods.map(([method, count], index) => (
                <tr key={method} className="border-t border-border">
                  {index === 0 && (
                    <td
                      className="px-4 py-3 text-muted-foreground align-top"
                      rowSpan={activeInputMethods.length}
                    >
                      {t('result.operationSummary.inputMethods')}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {inputMethodLabels[method]}: {t('result.operationSummary.times', { count })}
                  </td>
                </tr>
              ))}
            {/* Single-value rows */}
            {singleRows.map((row) => (
              <tr key={row.label} className="border-t border-border">
                <td className="px-4 py-3 text-muted-foreground">{row.label}</td>
                <td className="px-4 py-3">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-center">
        <button onClick={onViewDetails} className={`text-xs ${TEXT_LINK_MUTED_CLASSES}`}>
          {t('result.operationSummary.viewDetails')}
        </button>
      </div>
    </div>
  );
}

function ResultContent({ game, gameId, locale, displayName, breadcrumb }: ResultContentProps) {
  const t = useTranslations('play');
  const tGames = useTranslations('gamesPage');
  const router = useRouter();
  const [isOperationLogVisible, setIsOperationLogVisible] = useState(false);

  // Derive player result from game status
  const playerResult = game.status === 'win' ? 'win' : game.status === 'loss' ? 'loss' : 'draw';

  // Notation hook - game is guaranteed to be loaded here
  const { moves, formattedPgn } = useNotation({
    initialMoves: game.moves,
    startingFen: game.startingFen,
  });

  // Handlers
  const handlePostmortem = useCallback(() => {
    const pgnMoves = formattedPgn
      .map((move: FormattedPgnMove) => {
        const moveNumber = `${move.moveNumber}.`;
        if (!move.whiteMove && move.blackMove) {
          return `${moveNumber}.. ${move.blackMove}`;
        }
        const movePair = move.blackMove
          ? `${moveNumber} ${move.whiteMove} ${move.blackMove}`
          : `${moveNumber} ${move.whiteMove}`;
        return movePair;
      })
      .join(' ');

    const params = new URLSearchParams();
    params.set('pgn', pgnMoves);
    params.set('color', game.playerColor);
    params.set('autoOpponent', 'true');
    if (game.startingFen) params.set('fen', game.startingFen);
    params.set('gameId', gameId);
    for (const [key, value] of Object.entries(engineConfigToUrlParams(game.engineConfig))) {
      params.set(key, value);
    }
    params.set('moves', JSON.stringify(game.moves));

    router.push(`/${locale}/games/play/postmortem?${params.toString()}`);
  }, [game, formattedPgn, gameId, locale, router]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        {/* Game Result */}
        {playerResult === 'win' && (
          <VictoryCertificate displayName={displayName} engineConfig={game.engineConfig} />
        )}
        {playerResult !== 'win' && (
          <div className="py-6 text-center flex flex-col items-center gap-3">
            {playerResult === 'loss' && (
              <>
                <FaTimes className="w-12 h-12 text-destructive" />
                <h3 className="text-xl font-bold">{t('youLose')}</h3>
              </>
            )}
            {playerResult === 'draw' && (
              <>
                <FaMinus className="w-12 h-12 text-warning" />
                <h3 className="text-xl font-bold">{t('draw')}</h3>
              </>
            )}
          </div>
        )}

        {/* Operation Log Summary */}
        {game.operationLogs && game.operationLogs.length > 0 && (
          <>
            <div className="border-t border-border" />
            <OperationLogSummary
              logs={game.operationLogs}
              onViewDetails={() => setIsOperationLogVisible(true)}
            />
          </>
        )}

        <div className="border-t border-border" />

        {/* Action Buttons */}
        <div className="flex flex-col items-center gap-3 pt-2">
          {moves.length > 0 && (
            <Button
              variant="primary"
              size="lg"
              icon={<FaChartLine className="w-5 h-5" />}
              onClick={handlePostmortem}
              className="w-full rounded-xl font-medium"
            >
              {t('postmortem')}
            </Button>
          )}
          <Link href={`/${locale}/games`} className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
            {tGames('pageTitle')}
          </Link>
        </div>
      </div>

      {/* Operation Log Detail Modal */}
      {game.operationLogs && (
        <OperationLogModal
          isOpen={isOperationLogVisible}
          onClose={() => setIsOperationLogVisible(false)}
          logs={game.operationLogs}
          moves={game.moves}
          playerSide={game.playerColor}
          startingFen={game.startingFen}
        />
      )}

      <Divider />
      {breadcrumb}
    </div>
  );
}
