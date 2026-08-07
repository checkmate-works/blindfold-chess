import { MarkdownRenderer } from '@/app/_components/MarkdownRenderer';

const FORMULA = `$$|file_1 - file_2| = |rank_1 - rank_2|$$`;

export function BishopFormulaBlock() {
  return (
    <div className="my-4 text-center">
      <MarkdownRenderer content={FORMULA} />
    </div>
  );
}
