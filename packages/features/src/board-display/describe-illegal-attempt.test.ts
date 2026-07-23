import { describe, expect, it } from "vitest";

import { describeIllegalAttempt } from "./describe-illegal-attempt";

describe("describeIllegalAttempt", () => {
  it("renders a piece move as SAN (no capture)", () => {
    expect(
      describeIllegalAttempt({
        from: "g1",
        to: "f3",
        moverType: "n",
        targetOccupied: false,
      }),
    ).toBe("Nf3");
  });

  it("marks a piece capture with x when the target is occupied", () => {
    expect(
      describeIllegalAttempt({
        from: "f1",
        to: "b5",
        moverType: "b",
        targetOccupied: true,
      }),
    ).toBe("Bxb5");
  });

  it("uppercases every non-pawn piece letter", () => {
    expect(
      describeIllegalAttempt({
        from: "a1",
        to: "a4",
        moverType: "r",
        targetOccupied: false,
      }),
    ).toBe("Ra4");
    expect(
      describeIllegalAttempt({
        from: "d1",
        to: "d4",
        moverType: "q",
        targetOccupied: false,
      }),
    ).toBe("Qd4");
    expect(
      describeIllegalAttempt({
        from: "e1",
        to: "e3",
        moverType: "k",
        targetOccupied: false,
      }),
    ).toBe("Ke3");
  });

  it("renders a straight pawn push as the bare destination", () => {
    expect(
      describeIllegalAttempt({
        from: "e2",
        to: "e5",
        moverType: "p",
        targetOccupied: false,
      }),
    ).toBe("e5");
  });

  it("renders a diagonal pawn attempt as a file-prefixed capture", () => {
    // Files differ → diagonal → pawn-capture notation, regardless of whether
    // the engine would accept it (this is an illegal attempt).
    expect(
      describeIllegalAttempt({
        from: "e4",
        to: "d5",
        moverType: "p",
        targetOccupied: true,
      }),
    ).toBe("exd5");
    expect(
      describeIllegalAttempt({
        from: "e4",
        to: "d5",
        moverType: "p",
        targetOccupied: false,
      }),
    ).toBe("exd5");
  });

  it("falls back to coordinate long-notation when the mover is unknown", () => {
    expect(
      describeIllegalAttempt({
        from: "e2",
        to: "e4",
        moverType: null,
        targetOccupied: false,
      }),
    ).toBe("e2-e4");
  });
});
