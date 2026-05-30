import { HelpTourButton } from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

/** Translator compatible with both the page-level and `createPracticeTopPage` `t`. */
type TranslateFn = (key: string) => string;

const toKebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const nl2br = (text: string) => text.replace(/\n/g, '<br />');

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

/**
 * Build a single-step "intro" help tour for a practice module: one popover that
 * briefly explains what the module is and carries the tutorial link inline.
 *
 * Mirrors the position-memory list page's help tour. The step is anchored to a
 * `data-tour-id="<slug>-intro"` element (typically the setup block) and its
 * description renders as HTML — author newlines become `<br />` and a styled
 * tutorial anchor is appended after the overview text.
 *
 * @param t - the page's translator (global namespace)
 * @param i18nKey - module key under `practice.` (e.g. `fen`)
 * @param slug - URL slug used for the `targetId` prefix (e.g. `fen`)
 * @param locale - active locale, used to build the absolute tutorial href
 */
export function buildPracticeIntroHelpTour(
  t: TranslateFn,
  i18nKey: string,
  slug: string,
  locale: Locale
) {
  const tutorialHref = `/${locale}/practice/${slug}/tutorial`;
  const description =
    `${nl2br(t(`practice.${i18nKey}.help.overview.description`))}` +
    `<br /><br /><a href="${tutorialHref}" class="${TEXT_LINK_CLASSES}">${t(`practice.${i18nKey}.viewTutorial`)}</a>`;
  const steps: HelpStep[] = [
    {
      targetId: `${slug}-intro`,
      title: t(`practice.${i18nKey}.help.overview.title`),
      description,
      side: 'top',
      align: 'center',
    },
  ];
  return <HelpTourButton steps={steps} label={t(`practice.${i18nKey}.help.label`)} />;
}
