import { describe, expect, it } from "vitest";

import { filterRanks, modulesOfRank, practiceMenuType } from "./rank-filter";
import { MOBILE_PRACTICE_MODULES } from "../../navigation/practice-modules";

const slugs = (modules: readonly { slug: string }[]) =>
  modules.map((m) => m.slug);

describe("practiceMenuType", () => {
  it("reads the registry's snake_case name of a module", () => {
    const quadrants = MOBILE_PRACTICE_MODULES.find(
      (m) => m.slug === "quadrant-anchors",
    );
    expect(quadrants && practiceMenuType(quadrants)).toBe("quadrant_anchors");
  });
});

describe("filterRanks", () => {
  it("offers a chip only for the ranks some practice of the app belongs to, lowest first", () => {
    expect(filterRanks()).toEqual(["mukyu", "5kyu", "4kyu", "3kyu", "2kyu"]);
  });

  it("leaves out 1kyu and 1dan, whose requirements no practice row answers", () => {
    expect(filterRanks()).not.toContain("1kyu");
    expect(filterRanks()).not.toContain("1dan");
  });
});

describe("modulesOfRank", () => {
  it("narrows the list to the practices of one rank, in display order", () => {
    expect(slugs(modulesOfRank("mukyu"))).toEqual([
      "quadrant-anchors",
      "algebraic-notation",
    ]);
    expect(slugs(modulesOfRank("5kyu"))).toEqual([
      "coordinate-quiz",
      "square-colors",
    ]);
    expect(slugs(modulesOfRank("4kyu"))).toEqual(["legal-moves"]);
    expect(slugs(modulesOfRank("3kyu"))).toEqual(["route-planner"]);
    expect(slugs(modulesOfRank("2kyu"))).toEqual(["position-memory", "puzzle"]);
  });

  it("is empty for a rank no practice belongs to", () => {
    expect(modulesOfRank("1dan")).toEqual([]);
  });

  it("lists a practice no rank asks for under All only", () => {
    const unranked = [
      "board-symmetry",
      "diagonal-quiz",
      "knight-tour",
      "fen",
      "recall",
    ];
    expect(slugs(modulesOfRank(undefined))).toEqual(
      slugs(MOBILE_PRACTICE_MODULES),
    );
    for (const rank of filterRanks()) {
      const listed = slugs(modulesOfRank(rank));
      expect(listed.filter((slug) => unranked.includes(slug))).toEqual([]);
    }
  });
});
