import { describe, expect, it } from "vitest";

import { formatSignedDelta, signedDeltaTone } from "./signed-delta";

describe("formatSignedDelta", () => {
  it("signs a gain, a loss with a true minus, and no change", () => {
    expect(formatSignedDelta(2)).toBe("+2");
    expect(formatSignedDelta(-7)).toBe("−7");
    expect(formatSignedDelta(0)).toBe("±0");
  });

  it("gives the tone of each", () => {
    expect(signedDeltaTone(2)).toBe("up");
    expect(signedDeltaTone(-7)).toBe("down");
    expect(signedDeltaTone(0)).toBe("flat");
  });
});
