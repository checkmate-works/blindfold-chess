import { Fragment } from 'react';

import Link from 'next/link';

import { HiChevronRight } from 'react-icons/hi2';

import {
  LineChapterHeading,
  chapterHeadings,
} from '@/app/[locale]/(public)/repertoires/_components/LineChapterHeading';
import { LineListPanel } from '@/app/[locale]/(public)/repertoires/_components/LineListPanel';

/** One switchable sibling line: its 1-based number and its display title. */
export type LineNavItem = {
  id: string;
  lineNo: number;
  label: string;
  /** Chapter this line is filed under; null = unfiled. Drives the headings. */
  chapterName: string | null;
};

type Props = {
  items: LineNavItem[];
  /** The line currently being viewed — highlighted and not linked. */
  currentLineNo: number;
  repertoireId: string;
  locale: string;
  /** Section heading ("Lines"), resolved by the caller. */
  heading: string;
  /** Owner-only "add a line" row, mirroring the repertoire page's list. */
  addLineLabel?: string;
  /** Owner-only "arrange" link, mirroring the repertoire page's list. */
  manageLabel?: string;
  /** Divider label for the lines filed under no chapter. */
  unfiledLabel: string;
};

/**
 * The repertoire's line list, rendered next to a line's board so the reader can
 * jump between lines without going back to the repertoire page. Shares its
 * chrome with the repertoire detail page's sidebar (`LineListPanel`); the rows
 * here are plain navigation — no move preview, no board sync. Presentational
 * only: labels are resolved server-side, so this is safe to render from either
 * a server page or the client board.
 */
export function LineNavList({
  items,
  currentLineNo,
  repertoireId,
  locale,
  heading,
  addLineLabel,
  manageLabel,
  unfiledLabel,
}: Props) {
  const headings = chapterHeadings(items, unfiledLabel);
  return (
    <LineListPanel
      heading={heading}
      addLineHref={`/${locale}/repertoires/${repertoireId}/lines/new`}
      addLineLabel={addLineLabel}
      manageHref={`/${locale}/repertoires/${repertoireId}/lines`}
      manageLabel={items.length > 1 ? manageLabel : undefined}
    >
      {items.map((item, index) => {
        const isCurrent = item.lineNo === currentLineNo;
        const chapterHeading = headings[index];
        return (
          <Fragment key={item.id}>
            {chapterHeading !== null && <LineChapterHeading name={chapterHeading} />}
            <li className="border-b border-border last:border-b-0">
              {isCurrent ? (
                <div
                  aria-current="page"
                  className="flex items-center gap-3 bg-muted px-3 py-2.5 text-sm font-medium text-foreground"
                >
                  <span className="truncate">{item.label}</span>
                </div>
              ) : (
                <Link
                  href={`/${locale}/repertoires/${repertoireId}/lines/${item.lineNo}`}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
                >
                  <span className="truncate">{item.label}</span>
                  <HiChevronRight
                    aria-hidden
                    className="ml-auto size-4 flex-shrink-0 text-foreground/40"
                  />
                </Link>
              )}
            </li>
          </Fragment>
        );
      })}
    </LineListPanel>
  );
}
