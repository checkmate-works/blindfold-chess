import {
  DIFFICULTY_RUNGS,
  type PracticeLevel,
  difficultyRung,
} from '@/app/[locale]/(public)/practice/_lib/practice-levels';

/**
 * A difficulty band as a row of dots, one lit for Beginner through all four
 * for Expert.
 *
 * The same mark is drawn in the level filter's options and in the line above
 * each card's title, so the option a reader picked and the cards it left
 * visible carry the same symbol — the level is recognisable without reading
 * its name, and a card's band can be matched to the filter at a glance. The
 * dots also say, as a word cannot, that the bands are a scale.
 *
 * A band that is not on that scale — Introduction — draws the same four
 * dots with none of them lit. It first drew nothing at all, on the argument
 * that an empty row of dots claims position zero of a scale Introduction is
 * listed *after*. That argument is right about the scale and wrong about
 * what a reader sees: one band in the row missing a mark every other band
 * has reads as something forgotten, not as something deliberately off the
 * scale. None-of-four says the same thing without the gap — this is where
 * you are before the first level — and it is the reading Introduction wants
 * anyway.
 *
 * Drawn in `currentColor`, so the dots take the colour of whatever text they
 * sit beside: the foreground inside the filter's selected option, muted in a
 * card's eyebrow. Decorative — the label next to it carries the meaning.
 */
export function PracticeLevelDots({ level }: { level: PracticeLevel }) {
  const rung = difficultyRung(level);

  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-center gap-0.5">
      {DIFFICULTY_RUNGS.map((slot, i) => (
        <span
          key={slot}
          className={`size-1.5 rounded-full bg-current ${i <= rung ? '' : 'opacity-30'}`}
        />
      ))}
    </span>
  );
}
