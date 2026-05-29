import { HelpTourButton } from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components';

/** Translator compatible with both the page-level and `createPracticeTopPage` `t`. */
type TranslateFn = (key: string) => string;

const toKebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/**
 * Build the practice-module help tour button from a list of step names.
 *
 * Every practice top page rendered the same help-tour shape: an array of
 * `{ targetId: '<slug>-<step>', title/description from
 * `practice.<i18nKey>.help.<step>.{title,description}`, side: 'top',
 * align: 'center' }` wrapped in `<HelpTourButton>`. This collapses that to a
 * single call. Step names are camelCase i18n keys (e.g. `feedbackSpeed`); the
 * matching `targetId` uses their kebab-case form (`feedback-speed`).
 *
 * @param t - the page's translator (global namespace)
 * @param i18nKey - module key under `practice.` (e.g. `coordinateQuiz`)
 * @param slug - URL slug used for `targetId` prefixes (e.g. `coordinate-quiz`)
 * @param stepNames - ordered help steps (e.g. `['feedbackSpeed', 'challenge', 'training']`)
 */
export function buildPracticeHelpTour(
  t: TranslateFn,
  i18nKey: string,
  slug: string,
  stepNames: string[]
) {
  const steps: HelpStep[] = stepNames.map((name) => ({
    targetId: `${slug}-${toKebab(name)}`,
    title: t(`practice.${i18nKey}.help.${name}.title`),
    description: t(`practice.${i18nKey}.help.${name}.description`),
    side: 'top',
    align: 'center',
  }));
  return <HelpTourButton steps={steps} label={t(`practice.${i18nKey}.help.label`)} />;
}
