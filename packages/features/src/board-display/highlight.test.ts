import { describe, expect, it } from "vitest";

import { resolveSquareHighlight } from "./highlight";

const NONE = {
  isSelected: false,
  isCaptureDest: false,
  isLegalDestination: false,
  isLastMove: false,
  isExternalHighlight: false,
};

describe("resolveSquareHighlight", () => {
  it("falls through to none when nothing applies", () => {
    expect(resolveSquareHighlight(NONE)).toBe("none");
  });

  it("ranks the interactive move affordances above everything else", () => {
    expect(
      resolveSquareHighlight({ ...NONE, isSelected: true, isLastMove: true }),
    ).toBe("selected");
    expect(
      resolveSquareHighlight({
        ...NONE,
        isCaptureDest: true,
        isLegalDestination: true,
        isIllegalTo: true,
      }),
    ).toBe("capture-dest");
    expect(
      resolveSquareHighlight({
        ...NONE,
        isLegalDestination: true,
        isIllegalTo: true,
      }),
    ).toBe("move-dest");
  });

  it("shows a rejected attempt over the last-move tint", () => {
    // The near-miss worth looking at is precisely one aimed at a last-move
    // square; letting yellow win there would answer the viewer's tap with
    // no visible change at all.
    expect(
      resolveSquareHighlight({ ...NONE, isIllegalTo: true, isLastMove: true }),
    ).toBe("illegal-to");
    expect(
      resolveSquareHighlight({
        ...NONE,
        isIllegalFrom: true,
        isLastMove: true,
      }),
    ).toBe("illegal-from");
  });

  it("ranks the rejected destination above its origin when a move loops back to it", () => {
    expect(
      resolveSquareHighlight({
        ...NONE,
        isIllegalTo: true,
        isIllegalFrom: true,
      }),
    ).toBe("illegal-to");
  });

  it("keeps last-move above a plain external highlight", () => {
    expect(
      resolveSquareHighlight({
        ...NONE,
        isLastMove: true,
        isExternalHighlight: true,
      }),
    ).toBe("last-move");
  });
});
