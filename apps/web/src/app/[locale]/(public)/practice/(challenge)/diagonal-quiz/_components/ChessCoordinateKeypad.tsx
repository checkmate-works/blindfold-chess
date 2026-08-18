import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FILES, RANKS } from '@blindfold-chess/types';
import { FaBackspace } from 'react-icons/fa';

type Props = {
  expectingFile: boolean;
  expectingRank: boolean;
  isDisabled: boolean;
  onFilePress: (file: string) => void;
  onRankPress: (rank: string) => void;
  onBackspace: () => void;
  onClear: () => void;
};

export function ChessCoordinateKeypad({
  expectingFile,
  expectingRank,
  isDisabled,
  onFilePress,
  onRankPress,
  onBackspace,
  onClear,
}: Props) {
  const t = useTranslations('practice.diagonalQuiz');

  return (
    <div className="flex flex-col gap-2">
      {/* File buttons */}
      <div className="flex gap-1 justify-center w-full">
        {FILES.map((file) => (
          <button
            key={file}
            type="button"
            onClick={() => onFilePress(file)}
            disabled={isDisabled || !expectingFile}
            className={`flex-1 min-w-0 h-11 rounded-md font-mono text-lg transition-colors border touch-manipulation select-none ${
              expectingFile && !isDisabled
                ? 'bg-background hover:bg-muted border-border text-foreground'
                : 'bg-background border-border opacity-30 cursor-not-allowed text-muted-foreground'
            }`}
          >
            {file}
          </button>
        ))}
      </div>

      {/* Rank buttons */}
      <div className="flex gap-1 justify-center w-full">
        {RANKS.map((rank) => (
          <button
            key={rank}
            type="button"
            onClick={() => onRankPress(rank)}
            disabled={isDisabled || !expectingRank}
            className={`flex-1 min-w-0 h-11 rounded-md font-mono text-lg transition-colors border touch-manipulation select-none ${
              expectingRank && !isDisabled
                ? 'bg-background hover:bg-muted border-border text-foreground'
                : 'bg-background border-border opacity-30 cursor-not-allowed text-muted-foreground'
            }`}
          >
            {rank}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-1">
        <button
          type="button"
          onClick={onBackspace}
          disabled={isDisabled}
          className="flex-1 h-11 rounded-md font-mono text-lg transition-colors border border-border bg-background hover:bg-muted text-foreground flex items-center justify-center touch-manipulation select-none disabled:opacity-30 disabled:cursor-not-allowed"
          title={t('backspace')}
        >
          <FaBackspace className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={isDisabled}
          className="flex-1 h-11 rounded-md font-mono text-lg transition-colors border border-border bg-background hover:bg-muted text-foreground flex items-center justify-center touch-manipulation select-none disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {t('clear')}
        </button>
      </div>
    </div>
  );
}
