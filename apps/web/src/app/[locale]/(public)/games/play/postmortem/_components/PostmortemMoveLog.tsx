'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaFilter } from 'react-icons/fa';

import type { MoveLogEntry } from '../_lib';
import { MoveLogEntryItem } from './MoveLogEntryItem';

type Props = {
  entries: MoveLogEntry[];
  mode: 'playing' | 'completed';
  onFilterClick?: () => void;
  onMoveClick?: (entry: MoveLogEntry) => void;
};

export function PostmortemMoveLog({ entries, mode, onFilterClick, onMoveClick }: Props) {
  const t = useTranslations('postmortem');

  if (entries.length === 0) return null;

  if (mode === 'playing') {
    return (
      <div className="p-3 bg-muted/30 rounded-md max-h-48 overflow-y-auto">
        <div className="font-mono text-sm">
          {[...entries].reverse().map((entry, index) => (
            <MoveLogEntryItem key={entries.length - 1 - index} entry={entry} />
          ))}
        </div>
      </div>
    );
  }

  // completed mode
  return (
    <div className="bg-muted/30 rounded-md">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium text-muted-foreground">{t('moveLog')}</span>
        <button
          onClick={onFilterClick}
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted"
          aria-label={t('filterMoves')}
        >
          <FaFilter className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="p-3 max-h-48 overflow-y-auto">
        <div className="font-mono text-sm">
          {[...entries].reverse().map((entry, index) => (
            <MoveLogEntryItem
              key={entries.length - 1 - index}
              entry={entry}
              interactive
              onClick={() => onMoveClick?.(entry)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
