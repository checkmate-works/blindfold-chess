import { describe, expect, it } from "vitest";

import { flipForOrientation, mirrorSquare } from "./geometry";

describe("mirrorSquare", () => {
  describe('axis: "file" (left-right swap)', () => {
    it("mirrors a8 ↔ h8 (rank stays, file flips)", () => {
      expect(mirrorSquare("a8", "file")).toBe("h8");
      expect(mirrorSquare("h8", "file")).toBe("a8");
    });

    it("mirrors c5 ↔ f5", () => {
      expect(mirrorSquare("c5", "file")).toBe("f5");
      expect(mirrorSquare("f5", "file")).toBe("c5");
    });

    it("mirrors a1 ↔ h1", () => {
      expect(mirrorSquare("a1", "file")).toBe("h1");
    });

    it("d4 ↔ e4 — center swap", () => {
      expect(mirrorSquare("d4", "file")).toBe("e4");
    });
  });

  describe('axis: "rank" (top-bottom swap)', () => {
    it("mirrors a1 ↔ a8 (file stays, rank flips)", () => {
      expect(mirrorSquare("a1", "rank")).toBe("a8");
      expect(mirrorSquare("a8", "rank")).toBe("a1");
    });

    it("mirrors c5 ↔ c4", () => {
      expect(mirrorSquare("c5", "rank")).toBe("c4");
      expect(mirrorSquare("c4", "rank")).toBe("c5");
    });

    it("mirrors h1 ↔ h8", () => {
      expect(mirrorSquare("h1", "rank")).toBe("h8");
    });

    it("d4 ↔ d5 — center swap", () => {
      expect(mirrorSquare("d4", "rank")).toBe("d5");
    });
  });

  describe('axis: "point" (180° rotation)', () => {
    it("mirrors a1 ↔ h8", () => {
      expect(mirrorSquare("a1", "point")).toBe("h8");
      expect(mirrorSquare("h8", "point")).toBe("a1");
    });

    it("mirrors c5 ↔ f4", () => {
      expect(mirrorSquare("c5", "point")).toBe("f4");
      expect(mirrorSquare("f4", "point")).toBe("c5");
    });

    it("mirrors a8 ↔ h1", () => {
      expect(mirrorSquare("a8", "point")).toBe("h1");
    });

    it("d4 ↔ e5 — both axes flipped", () => {
      expect(mirrorSquare("d4", "point")).toBe("e5");
    });
  });
});

describe("flipForOrientation", () => {
  describe('orientation: "white"', () => {
    it("returns indices unchanged (identity)", () => {
      expect(flipForOrientation(0, 0, "white")).toEqual({ file: 0, rank: 0 });
      expect(flipForOrientation(7, 7, "white")).toEqual({ file: 7, rank: 7 });
      expect(flipForOrientation(3, 4, "white")).toEqual({ file: 3, rank: 4 });
    });
  });

  describe('orientation: "black"', () => {
    it("flips both axes (equivalent to point reflection)", () => {
      expect(flipForOrientation(0, 0, "black")).toEqual({ file: 7, rank: 7 });
      expect(flipForOrientation(7, 7, "black")).toEqual({ file: 0, rank: 0 });
      expect(flipForOrientation(3, 4, "black")).toEqual({ file: 4, rank: 3 });
      expect(flipForOrientation(2, 5, "black")).toEqual({ file: 5, rank: 2 });
    });
  });
});
