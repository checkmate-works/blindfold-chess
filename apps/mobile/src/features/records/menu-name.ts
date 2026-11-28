import type { TFunction } from "i18next";
import { MODULE_TO_SLUG } from "@blindfold-chess/features/practice-registry";

import {
  MOBILE_PRACTICE_MODULES,
  type MobilePracticeModule,
} from "../../navigation/practice-modules";

/** The app's practice module for a registry module (`legal_moves`), if any. */
export function practiceModuleOf(
  menu: string,
): MobilePracticeModule | undefined {
  const slug = (MODULE_TO_SLUG as Record<string, string>)[menu];
  return MOBILE_PRACTICE_MODULES.find((m) => m.slug === slug);
}

/**
 * A challenge's name as the practice tab writes it, so My Records and the
 * practice list call each challenge the same. An unknown menu is shown as
 * it is.
 */
export function menuNameOf(menu: string, t: TFunction): string {
  const module = practiceModuleOf(menu);
  return module ? t(`practice.${module.i18nKey}.title`) : menu;
}
