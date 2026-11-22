import { describe, expect, it } from "vitest";

import ja from "../../../i18n/resources/ja.json";
import {
  ONBOARDING_SCRIPT,
  ONBOARDING_START_ID,
  type OnboardingDestination,
  type ScriptStep,
} from "../data/script";

function nextIds(step: ScriptStep): string[] {
  if (step.type === "statement") return [step.nextId];
  if (step.type === "question") return step.choices.map((c) => c.nextId);
  return [];
}

function lookup(key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      ja,
    );
}

describe("ONBOARDING_SCRIPT", () => {
  it("keys every step by its own id", () => {
    for (const [id, step] of Object.entries(ONBOARDING_SCRIPT)) {
      expect(step.id).toBe(id);
    }
  });

  it("points only at steps that exist", () => {
    for (const step of Object.values(ONBOARDING_SCRIPT)) {
      for (const next of nextIds(step)) {
        expect(ONBOARDING_SCRIPT[next], `${step.id} → ${next}`).toBeDefined();
      }
    }
  });

  it("reaches every step from the start and ends every path at a finish", () => {
    const seen = new Set<string>();
    const destinations = new Set<OnboardingDestination>();
    const walk = (id: string, depth: number) => {
      expect(depth, "the script has a loop").toBeLessThan(20);
      seen.add(id);
      const step = ONBOARDING_SCRIPT[id];
      if (step.type === "finish") destinations.add(step.destination);
      for (const next of nextIds(step)) walk(next, depth + 1);
    };
    walk(ONBOARDING_START_ID, 0);
    expect([...seen].sort()).toEqual(Object.keys(ONBOARDING_SCRIPT).sort());
    expect([...destinations].sort()).toEqual(["ai-game", "practice"]);
  });

  it("sends only the blindfold-confident answer to the AI game", () => {
    const question = Object.values(ONBOARDING_SCRIPT).find(
      (s) => s.type === "question",
    );
    if (question?.type !== "question") throw new Error("no question step");
    const destinationOf = (id: string): OnboardingDestination => {
      const step = ONBOARDING_SCRIPT[id];
      if (step.type === "finish") return step.destination;
      if (step.type === "statement") return destinationOf(step.nextId);
      throw new Error(`a second question at ${id}`);
    };
    expect(question.choices.map((c) => destinationOf(c.nextId))).toEqual([
      "ai-game",
      "practice",
      "practice",
    ]);
  });

  it("names only keys that exist in the dictionary", () => {
    for (const step of Object.values(ONBOARDING_SCRIPT)) {
      const keys = [
        step.textKey,
        ...(step.type === "question"
          ? step.choices.map((c) => c.labelKey)
          : []),
        ...(step.type === "finish" ? [step.ctaKey] : []),
      ];
      for (const key of keys) {
        expect(typeof lookup(key), key).toBe("string");
      }
    }
  });
});
