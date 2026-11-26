'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import {
  A_FILE_ANTI_DIAGONALS,
  A_FILE_DIAGONALS,
  type DiagonalPair,
  RANK_1_DIAGONALS,
  RANK_8_ANTI_DIAGONALS,
} from '@blindfold-chess/features/dojo-guides';

function PatternTable({
  title,
  pairs,
  highlight,
}: {
  title: string;
  pairs: readonly DiagonalPair[];
  highlight?: number;
}) {
  const t = useTranslations('guides.visualAids.diagonalPatternTables');
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-foreground">{title}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="py-1 text-left font-medium text-muted-foreground">
              {t('headers.start')}
            </th>
            <th className="py-1 text-left font-medium text-muted-foreground"></th>
            <th className="py-1 text-left font-medium text-muted-foreground">{t('headers.end')}</th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((pair, i) => (
            <tr
              key={i}
              className={`border-b border-border/50 ${i === 0 && highlight === 0 ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}
            >
              <td className="py-1 font-mono text-foreground">{pair.start}</td>
              <td className="py-1 text-muted-foreground">&rarr;</td>
              <td className="py-1 font-mono text-foreground">{pair.end}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DiagonalAFileTable() {
  const t = useTranslations('guides.visualAids.diagonalPatternTables');
  return (
    <div className="mx-auto max-w-xs sm:max-w-sm">
      <PatternTable title={t('aFileStart')} pairs={A_FILE_DIAGONALS} highlight={0} />
    </div>
  );
}

export function DiagonalRank1Table() {
  const t = useTranslations('guides.visualAids.diagonalPatternTables');
  return (
    <div className="mx-auto max-w-xs sm:max-w-sm">
      <PatternTable title={t('rank1Start')} pairs={RANK_1_DIAGONALS} />
    </div>
  );
}

export function AntiDiagAFileTable() {
  const t = useTranslations('guides.visualAids.diagonalPatternTables');
  return (
    <div className="mx-auto max-w-xs sm:max-w-sm">
      <PatternTable title={t('aFileStart')} pairs={A_FILE_ANTI_DIAGONALS} highlight={0} />
    </div>
  );
}

export function AntiDiagRank8Table() {
  const t = useTranslations('guides.visualAids.diagonalPatternTables');
  return (
    <div className="mx-auto max-w-xs sm:max-w-sm">
      <PatternTable title={t('rank8Start')} pairs={RANK_8_ANTI_DIAGONALS} />
    </div>
  );
}
