import { describe, expect, it } from "vitest";

import { createEvaluationAccumulator } from "./evaluation-accumulator";

describe("createEvaluationAccumulator", () => {
  it("starts empty and ignores non-score lines", () => {
    const acc = createEvaluationAccumulator();
    acc.onInfo("info depth 10 nodes 12345");
    expect(acc.score).toBeNull();
    expect(acc.mate).toBeUndefined();
  });

  it("keeps the latest cp score and clears a stale mate", () => {
    const acc = createEvaluationAccumulator();
    acc.onInfo("info depth 8 score mate 3 pv e2e4");
    acc.onInfo("info depth 12 score cp 42 pv e2e4");
    expect(acc.score).toBe(42);
    expect(acc.mate).toBeUndefined();
  });

  it("saturates the cp stand-in for mate scores by sign", () => {
    const acc = createEvaluationAccumulator();
    acc.onInfo("info depth 20 score mate 2 pv d1h5");
    expect(acc.score).toBe(10000);
    expect(acc.mate).toBe(2);

    acc.onInfo("info depth 20 score mate -4 pv a2a3");
    expect(acc.score).toBe(-10000);
    expect(acc.mate).toBe(-4);
  });
});
