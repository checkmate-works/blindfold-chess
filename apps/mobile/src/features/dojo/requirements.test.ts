import i18next from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import {
  EARNED_RANK_SLUGS,
  RANK_REQUIREMENTS,
  isRequirementPlayableOnMobile,
} from "@blindfold-chess/features/dojo-ranks";

import en from "../../i18n/resources/en.json";
import ja from "../../i18n/resources/ja.json";
import {
  guidePath,
  parseHighestRank,
  requirementLabel,
  requirementTarget,
} from "./requirements";

const ALL_REQUIREMENTS = EARNED_RANK_SLUGS.flatMap(
  (slug) => RANK_REQUIREMENTS[slug],
);

describe("requirementTarget", () => {
  it("sends every challenge requirement to a setup screen the app has", () => {
    const targets = ALL_REQUIREMENTS.filter(isRequirementPlayableOnMobile).map(
      requirementTarget,
    );
    expect(targets).toContainEqual({
      kind: "practice",
      pathname: "/practice/square-colors",
    });
    expect(targets).toContainEqual({
      kind: "practice",
      pathname: "/practice/route-planner",
    });
    expect(targets.every((target) => target.kind === "practice")).toBe(true);
  });

  it("sends posting and publishing to the web", () => {
    expect(requirementTarget(RANK_REQUIREMENTS["2kyu"][0]!)).toEqual({
      kind: "web",
      path: "/practice/position-memory/new",
    });
    expect(requirementTarget(RANK_REQUIREMENTS["1dan"][0]!)).toEqual({
      kind: "web",
      path: "/games/new/standard",
    });
  });
});

describe("requirementLabel", () => {
  const t = i18next.createInstance();
  beforeAll(async () => {
    await t.init({
      lng: "ja",
      resources: { ja: { translation: ja }, en: { translation: en } },
    });
  });

  it("finds a string for every requirement in every rank", async () => {
    for (const lng of ["ja", "en"]) {
      await t.changeLanguage(lng);
      for (const requirement of [
        ...ALL_REQUIREMENTS,
        { type: "dojo_exam", rank: "2kyu" } as const,
      ]) {
        const label = requirementLabel(requirement, t.t);
        expect(label).not.toMatch(/ranks\.|\{\{/);
      }
    }
  });

  it("reads a challenge score with its piece and threshold", async () => {
    await t.changeLanguage("ja");
    expect(requirementLabel(RANK_REQUIREMENTS["4kyu"][1]!, t.t)).toBe(
      "合法手チャレンジ（ナイト）でスコア20以上",
    );
  });

  it("joins the kinds of position that count with 'or'", async () => {
    await t.changeLanguage("en");
    expect(requirementLabel(RANK_REQUIREMENTS["2kyu"][0]!, t.t)).toBe(
      "Submit at least 1 position-memory problem or Submit at least 1 puzzle",
    );
  });
});

describe("guidePath", () => {
  it("opens the in-app guide of the ranks that have one", () => {
    expect(guidePath("mukyu")).toBe("/dojo/guides/mukyu");
    expect(guidePath("5kyu")).toBe("/dojo/guides/5kyu");
    expect(guidePath("1dan")).toBeUndefined();
  });
});

describe("parseHighestRank", () => {
  it("keeps known slugs and drops the rest", () => {
    expect(parseHighestRank("3kyu")).toBe("3kyu");
    expect(parseHighestRank("9dan")).toBeUndefined();
    expect(parseHighestRank(null)).toBeUndefined();
  });
});
