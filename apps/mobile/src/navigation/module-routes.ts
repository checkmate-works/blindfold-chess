import type { ModuleRoute } from "./module-stack-screens";
import {
  MOBILE_PRACTICE_MODULES,
  practiceModuleRoute,
} from "./practice-modules";

/** Every practice module's flow, rooted at `practice/<route>`. */
export const PRACTICE_MODULE_ROUTES: readonly ModuleRoute[] =
  MOBILE_PRACTICE_MODULES.map((module) => ({
    route: `practice/${practiceModuleRoute(module)}`,
    i18nKey: module.i18nKey,
    hasTraining: module.hasTraining,
  }));

/** The play flows (games against the engine), rooted at `play/<route>`. */
export const PLAY_MODULE_ROUTES: readonly ModuleRoute[] = [
  { route: "play/ai-game", i18nKey: "aiGame" },
];

export const ALL_MODULE_ROUTES: readonly ModuleRoute[] = [
  ...PRACTICE_MODULE_ROUTES,
  ...PLAY_MODULE_ROUTES,
];
