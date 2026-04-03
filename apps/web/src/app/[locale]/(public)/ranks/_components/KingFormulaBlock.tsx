'use client';

import { MarkdownRenderer } from '@/app/[locale]/_components/MarkdownRenderer';

const FORMULA = `$$\\max(|file_1 - file_2|, |rank_1 - rank_2|) = 1$$`;

export function KingFormulaBlock() {
  return (
    <div className="my-4 text-center">
      <MarkdownRenderer content={FORMULA} />
    </div>
  );
}
