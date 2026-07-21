'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

type DiagonalPair = { start: string; end: string };

const A_FILE_DIAGONALS: DiagonalPair[] = [
  { start: 'a1', end: 'h8' },
  { start: 'a2', end: 'g8' },
  { start: 'a3', end: 'f8' },
  { start: 'a4', end: 'e8' },
  { start: 'a5', end: 'd8' },
  { start: 'a6', end: 'c8' },
  { start: 'a7', end: 'b8' },
];

const RANK_1_DIAGONALS: DiagonalPair[] = [
  { start: 'b1', end: 'h7' },
  { start: 'c1', end: 'h6' },
  { start: 'd1', end: 'h5' },
  { start: 'e1', end: 'h4' },
  { start: 'f1', end: 'h3' },
  { start: 'g1', end: 'h2' },
];

const A_FILE_ANTI_DIAGS: DiagonalPair[] = [
  { start: 'a8', end: 'h1' },
  { start: 'a7', end: 'g1' },
  { start: 'a6', end: 'f1' },
  { start: 'a5', end: 'e1' },
  { start: 'a4', end: 'd1' },
  { start: 'a3', end: 'c1' },
  { start: 'a2', end: 'b1' },
];

const RANK_8_ANTI_DIAGS: DiagonalPair[] = [
  { start: 'b8', end: 'h2' },
  { start: 'c8', end: 'h3' },
  { start: 'd8', end: 'h4' },
  { start: 'e8', end: 'h5' },
  { start: 'f8', end: 'h6' },
  { start: 'g8', end: 'h7' },
];

function PatternTable({
  title,
  pairs,
  highlight,
}: {
  title: string;
  pairs: DiagonalPair[];
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
      <PatternTable title={t('aFileStart')} pairs={A_FILE_ANTI_DIAGS} highlight={0} />
    </div>
  );
}

export function AntiDiagRank8Table() {
  const t = useTranslations('guides.visualAids.diagonalPatternTables');
  return (
    <div className="mx-auto max-w-xs sm:max-w-sm">
      <PatternTable title={t('rank8Start')} pairs={RANK_8_ANTI_DIAGS} />
    </div>
  );
}
