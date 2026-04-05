'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

import type { MoveOperationLog } from '@/lib/types';

import { Modal } from '@/app/[locale]/_components/Modal';

import { getMovingSide } from '../_lib/fen-utils';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  logs: MoveOperationLog[];
  moves: AlgebraicNotation[];
  playerSide: Side;
  startingFen?: string;
};

export function OperationLogModal({
  isOpen,
  onClose,
  logs,
  moves,
  playerSide,
  startingFen,
}: Props) {
  const t = useTranslations('play');

  // Extract player moves from the interleaved moves array.
  // Uses getMovingSide to correctly handle custom starting FEN (e.g., black-to-move positions).
  const playerMoveIndices = moves.reduce<number[]>((acc, _, index) => {
    if (getMovingSide(index, startingFen) === playerSide) acc.push(index);
    return acc;
  }, []);

  const inputMethodLabel = (method: MoveOperationLog['inputMethod']): string => {
    switch (method) {
      case 'button':
        return t('operationLog.inputMethodButton');
      case 'text':
        return t('operationLog.inputMethodText');
      case 'text-autocomplete':
        return t('operationLog.inputMethodTextAutocomplete');
      case 'select':
        return t('operationLog.inputMethodSelect');
      default:
        return method;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('operationLog.title')} maxWidth="max-w-lg">
      {logs.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('operationLog.noLogs')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 px-2 font-medium text-muted-foreground">#</th>
                <th className="py-2 px-2 font-medium text-muted-foreground">
                  {t('operationLog.columnMove')}
                </th>
                <th className="py-2 px-2 font-medium text-muted-foreground">
                  {t('operationLog.columnInputMethod')}
                </th>
                <th className="py-2 px-2 font-medium text-muted-foreground text-center">
                  {t('operationLog.columnPeek')}
                </th>
                <th className="py-2 px-2 font-medium text-muted-foreground text-center">
                  {t('operationLog.columnUndo')}
                </th>
                <th className="py-2 px-2 font-medium text-muted-foreground text-center">
                  {t('operationLog.columnMovePeek')}
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => {
                const moveIndex = playerMoveIndices[i];
                const move = moveIndex !== undefined ? moves[moveIndex] : '—';
                return (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-2 px-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 px-2 font-mono">{move}</td>
                    <td className="py-2 px-2">{inputMethodLabel(log.inputMethod)}</td>
                    <td className="py-2 px-2 text-center">{log.peekCount}</td>
                    <td className="py-2 px-2 text-center">{log.undoCount}</td>
                    <td className="py-2 px-2 text-center">{log.movePeekCount ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
