/**
 * A chapter's name as a sticky separator inside the line list.
 *
 * Read surfaces show grouping, not the grouping CONTROLS — there is no grip, no
 * rename box, no delete. Those live on the arrange page; here a heading is
 * signage. It sticks to the top of the panel's scroll area so a reader scrolling
 * a long course always knows which chapter they are in, which is the whole
 * reason to show chapters on a read surface at all.
 */
export function LineChapterHeading({ name }: { name: string }) {
  return (
    <li className="sticky top-0 z-10 border-b border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
      <span className="block truncate">{name}</span>
    </li>
  );
}

/**
 * Which rows need a chapter heading rendered above them.
 *
 * Lines arrive in display order (chapter, then within-chapter — see
 * `linesInDisplayOrder`), so a heading is needed exactly where the chapter
 * changes. That also means an EMPTY chapter never gets one: it has no line to
 * change to. Deliberate — a heading with nothing under it is noise to a reader,
 * and the arrange page is where an empty chapter is visible and removable.
 *
 * Returns nulls throughout when the course has no chapters at all, so the
 * unfiled bucket is never labelled "Unfiled" when it is simply "the lines".
 */
export function chapterHeadings(
  lines: readonly { chapterName: string | null }[],
  unfiledLabel: string
): (string | null)[] {
  const hasChapters = lines.some((line) => line.chapterName !== null);
  if (!hasChapters) return lines.map(() => null);

  let previous: string | null | undefined;
  return lines.map((line) => {
    const changed = line.chapterName !== previous;
    previous = line.chapterName;
    if (!changed) return null;
    // A course with chapters can still have loose lines; they follow the
    // chapters and need a divider of their own, or they would read as the last
    // chapter's tail.
    return line.chapterName ?? unfiledLabel;
  });
}
