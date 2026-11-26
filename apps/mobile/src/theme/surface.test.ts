import { lightColors } from "@blindfold-chess/ui";
import { describe, expect, it } from "vitest";

import { surfaceColors } from "./surface";

describe("surfaceColors", () => {
  it("defines the same tokens for light and dark", () => {
    expect(Object.keys(surfaceColors.dark).sort()).toEqual(
      Object.keys(surfaceColors.light).sort(),
    );
  });

  it("adds tokens without shadowing any shared palette color it is merged over", () => {
    const shared = new Set(Object.keys(lightColors));
    const shadowed = Object.keys(surfaceColors.light).filter((key) =>
      shared.has(key),
    );
    expect(shadowed).toEqual([]);
  });
});
