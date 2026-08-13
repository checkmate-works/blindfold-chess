'use client';

import { LinkedText } from '@/app/[locale]/_components/LinkedText';

/** The two shapes any move-reference parser produces. */
type Segment = { type: 'text'; value: string } | { type: 'moveRef'; raw: string };

type Props<T extends Segment> = {
  /** The original body, rendered whole when nothing was linkified. */
  text: string;
  segments: readonly T[];
  locale: string;
  /** Called with the clicked reference so the caller can open its preview. */
  onSelect: (segment: Extract<T, { type: 'moveRef' }>) => void;
};

/**
 * Render a comment body whose move references have been picked out, turning
 * each reference into a button and linkifying the prose around it.
 *
 * Two bodies do this — a shared game's comments, which branch from a move in
 * the game, and a chunk's, which branch from one position — and their parsers
 * are genuinely different (see each `_lib` module's TSDoc: a bare pawn push may
 * open a run in one and not the other). The rendering is not: the same
 * single-text-segment shortcut, the same dotted-underline button, the same
 * `key`-by-index map.
 *
 * The preview modal stays with the caller, because what a reference is
 * previewed *from* is exactly what the two disagree about.
 */
export function MoveSegmentText<T extends Segment>({ text, segments, locale, onSelect }: Props<T>) {
  // Nothing was linkified — render the body in one piece rather than as a
  // one-element list, so linkification of URLs spanning the whole text works.
  if (segments.length === 1 && segments[0].type === 'text') {
    return <LinkedText text={text} locale={locale} />;
  }

  return (
    <>
      {segments.map((segment, i) =>
        segment.type === 'text' ? (
          <LinkedText key={i} text={segment.value} locale={locale} />
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(segment as Extract<T, { type: 'moveRef' }>)}
            className="underline decoration-dotted underline-offset-2 hover:text-primary transition-colors"
          >
            {segment.raw}
          </button>
        )
      )}
    </>
  );
}
