import { describe, expect, it } from "vitest";

import {
  parseEnumListParam,
  parseEnumParam,
  parseIntParam,
  parseNumberEnumParam,
} from "./route-params";

const SIDES = ["white", "black"] as const;

describe("parseEnumParam", () => {
  it("accepts a member of the allowed list", () => {
    expect(parseEnumParam("black", SIDES, "white")).toBe("black");
  });

  it("falls back on junk input", () => {
    expect(parseEnumParam("purple", SIDES, "white")).toBe("white");
  });

  it("falls back on a missing param", () => {
    expect(parseEnumParam(undefined, SIDES, "white")).toBe("white");
  });

  it("falls back on the empty string (not treated as a member)", () => {
    expect(parseEnumParam("", SIDES, "white")).toBe("white");
  });
});

describe("parseNumberEnumParam", () => {
  const LEVELS = [1, 2, 3] as const;

  it("accepts a numeric member", () => {
    expect(parseNumberEnumParam("2", LEVELS, 1)).toBe(2);
  });

  it("falls back on junk (NaN never escapes)", () => {
    expect(parseNumberEnumParam("abc", LEVELS, 1)).toBe(1);
  });

  it("falls back on out-of-range numbers", () => {
    expect(parseNumberEnumParam("99", LEVELS, 1)).toBe(1);
  });
});

describe("parseIntParam", () => {
  it("parses a valid integer", () => {
    expect(parseIntParam("60", { min: 1, fallback: 30 })).toBe(60);
  });

  it("falls back on junk", () => {
    expect(parseIntParam("abc", { min: 1, fallback: 30 })).toBe(30);
  });

  it("falls back below the lower bound", () => {
    expect(parseIntParam("0", { min: 1, fallback: 30 })).toBe(30);
  });

  it("falls back on non-integers", () => {
    expect(parseIntParam("1.5", { min: 1, fallback: 30 })).toBe(30);
  });

  it("falls back on a missing param", () => {
    expect(parseIntParam(undefined, { fallback: 0 })).toBe(0);
  });
});

describe("parseEnumListParam", () => {
  const PIECES = ["b", "n", "r", "q", "k"] as const;

  it("keeps valid members and drops junk", () => {
    expect(parseEnumListParam("b,x,n", PIECES, PIECES)).toEqual(["b", "n"]);
  });

  it("falls back when nothing valid remains", () => {
    expect(parseEnumListParam("x,y", PIECES, PIECES)).toEqual([...PIECES]);
  });

  it("falls back on a missing param", () => {
    expect(parseEnumListParam(undefined, PIECES, PIECES)).toEqual([...PIECES]);
  });

  it("returns a fresh array, not the fallback reference", () => {
    const result = parseEnumListParam(undefined, PIECES, PIECES);
    expect(result).not.toBe(PIECES);
  });
});
