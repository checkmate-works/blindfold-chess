import { existsSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { PRACTICE_MODULE_REGISTRY } from "@blindfold-chess/features/practice-registry";

import {
  MOBILE_PRACTICE_MODULES,
  practiceModuleRoute,
} from "../practice-modules";

/**
 * MOBILE_PRACTICE_MODULES drives both the practice list and the stack
 * registrations, but expo-router finds screens by file. A table entry without
 * its route files is a card that opens nothing, and a `hasTraining` flag
 * without `training.tsx` registers a screen that does not exist (or the
 * reverse leaves a training screen unreachable), so check the two agree.
 */
const PRACTICE_ROUTES_DIR = join(
  __dirname,
  "..",
  "..",
  "app",
  "(tabs)",
  "practice",
);

describe("MOBILE_PRACTICE_MODULES", () => {
  it("lists each registry slug at most once", () => {
    const slugs = MOBILE_PRACTICE_MODULES.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("only lists slugs the shared registry knows", () => {
    const registered = new Set<string>(
      PRACTICE_MODULE_REGISTRY.map((m) => m.slugKebab),
    );
    for (const m of MOBILE_PRACTICE_MODULES) {
      expect(registered.has(m.slug), m.slug).toBe(true);
    }
  });

  // The FEN entry was registered before its screens exist (they are built on
  // a parallel branch). Remove this exclusion once `practice/fen/` lands.
  const withScreens = MOBILE_PRACTICE_MODULES.filter((m) => m.slug !== "fen");

  it.each(withScreens.map((m) => [practiceModuleRoute(m), m] as const))(
    "%s has setup, session and result screens",
    (route) => {
      for (const screen of ["setup", "session", "result"]) {
        expect(
          existsSync(join(PRACTICE_ROUTES_DIR, route, `${screen}.tsx`)),
          `${route}/${screen}.tsx`,
        ).toBe(true);
      }
    },
  );

  it.each(
    MOBILE_PRACTICE_MODULES.map((m) => [practiceModuleRoute(m), m] as const),
  )("%s has a training screen exactly when flagged hasTraining", (route, m) => {
    expect(existsSync(join(PRACTICE_ROUTES_DIR, route, "training.tsx"))).toBe(
      m.hasTraining === true,
    );
  });
});
