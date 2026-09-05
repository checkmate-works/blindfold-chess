import {
  DIFFICULTY_RUNGS,
  type PracticeLevel,
  difficultyRung,
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
 * A band that is not on that scale — Introduction — draws nothing. Three
 * unlit dots would have put it at position zero of a scale it is listed
 * after, which is the one reading to avoid. The dots still take their space
 * (`invisible`, not unrendered) so an Introduction label lines up with the
 * labels of the bands that do carry dots, in the filter row and across the
 * card grid.
 *
 * Drawn in `currentColor`, so the dots take the colour of whatever text they
 * sit beside: the foreground inside the filter's selected option, muted in a
 * card's eyebrow. Decorative — the label next to it carries the meaning.
 */
export function PracticeLevelDots({ level }: { level: PracticeLevel }) {
  const rung = difficultyRung(level);

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center gap-0.5 ${rung < 0 ? 'invisible' : ''}`}
    >
      {DIFFICULTY_RUNGS.map((slot, i) => (
        <span
          key={slot}
          className={`size-1.5 rounded-full bg-current ${i <= rung ? '' : 'opacity-30'}`}
        />
      ))}
    </span>
  );
}
