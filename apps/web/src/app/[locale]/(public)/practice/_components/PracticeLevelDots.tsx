import {
  PRACTICE_LEVELS,
  type PracticeLevel,
} from '@/app/[locale]/(public)/practice/_lib/practice-levels';

/**
 * A difficulty band as a row of three dots, one lit for Beginner through all
 * three for Advanced.
 *
 * The same mark is drawn in the level filter's options and in the line above
 * each card's title, so the option a reader picked and the cards it left
 * visible carry the same symbol — the level is recognisable without reading
 * its name, and a card's band can be matched to the filter at a glance.
 * Three dots also say, as a word cannot, that the bands are a scale.
 *
 * Drawn in `currentColor`, so the dots take the colour of whatever text they
 * sit beside: white inside the filter's selected option, muted in a card's
 * eyebrow. Decorative — the label next to it carries the meaning.
 */
export function PracticeLevelDots({ level }: { level: PracticeLevel }) {
  const lit = PRACTICE_LEVELS.indexOf(level) + 1;
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-center gap-0.5">
      {PRACTICE_LEVELS.map((slot, i) => (
        <span
          key={slot}
          className={`size-1.5 rounded-full bg-current ${i < lit ? '' : 'opacity-30'}`}
        />
      ))}
    </span>
  );
}
