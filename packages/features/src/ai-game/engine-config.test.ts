import { describe, expect, it } from "vitest";

import { isEngineConfig, isEngineKind } from "./engine-config";

describe("isEngineKind", () => {
  it("accepts the shipped engines and nothing else", () => {
    expect(isEngineKind("stockfish")).toBe(true);
    expect(isEngineKind("maia")).toBe(true);
    expect(isEngineKind("lc0")).toBe(false);
    expect(isEngineKind(undefined)).toBe(false);
  });
});

describe("isEngineConfig", () => {
  it("accepts a well-formed Stockfish config", () => {
    expect(isEngineConfig({ kind: "stockfish", skillLevel: 5 })).toBe(true);
  });

  it("accepts a well-formed Maia config", () => {
    expect(isEngineConfig({ kind: "maia", rating: 1600 })).toBe(true);
  });

  it("rejects Stockfish with an out-of-range skillLevel", () => {
    expect(isEngineConfig({ kind: "stockfish", skillLevel: 99 })).toBe(false);
  });

  it("rejects Maia with an off-catalog rating", () => {
    expect(isEngineConfig({ kind: "maia", rating: 1234 })).toBe(false);
  });

  it("rejects unknown discriminators", () => {
    expect(isEngineConfig({ kind: "lc0", someValue: 1 })).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(isEngineConfig(null)).toBe(false);
    expect(isEngineConfig(undefined)).toBe(false);
    expect(isEngineConfig("stockfish")).toBe(false);
    expect(isEngineConfig(5)).toBe(false);
  });
});
