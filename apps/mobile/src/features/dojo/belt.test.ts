import { describe, expect, it } from "vitest";
import {
  BELT_COLOR_HEX,
  RANK_SLUGS,
} from "@blindfold-chess/features/dojo-ranks";
import { darkColors, lightColors } from "@blindfold-chess/ui";

import { BELT_TINTS, beltColors, contrastRatio } from "./belt";

describe("contrastRatio", () => {
  it("is 21 between black and white, whichever comes first", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
  });

  it("is 1 between a colour and itself", () => {
    expect(contrastRatio("#eab308", "#eab308")).toBeCloseTo(1, 5);
  });
});

describe("BELT_TINTS", () => {
  for (const slug of RANK_SLUGS) {
    for (const scheme of ["light", "dark"] as const) {
      it(`keeps ${slug}'s text readable on its wash and pressed wash (${scheme}, 4.5:1)`, () => {
        const { tint, tintText, tintPressed } = BELT_TINTS[slug][scheme];
        expect(contrastRatio(tintText, tint)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(tintText, tintPressed)).toBeGreaterThanOrEqual(
          4.5,
        );
      });
    }
  }
});

describe("beltColors", () => {
  it("takes the light wash on the light theme and the dark wash on the dark theme", () => {
    expect(beltColors("3kyu", lightColors).tint).toBe(
      BELT_TINTS["3kyu"].light.tint,
    );
    expect(beltColors("3kyu", darkColors).tint).toBe(
      BELT_TINTS["3kyu"].dark.tint,
    );
  });

  it("keeps the belt itself the shared belt colour", () => {
    for (const slug of RANK_SLUGS) {
      expect(beltColors(slug, lightColors).fill).toBe(BELT_COLOR_HEX[slug]);
    }
  });
});
