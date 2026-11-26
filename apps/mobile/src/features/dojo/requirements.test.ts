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
  mobileRankRequirements,
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

  it("sends every exam problem to its rank's exam screen", () => {
    for (const requirement of RANK_REQUIREMENTS["2kyu"]) {
      expect(requirementTarget(requirement)).toEqual({
        kind: "practice",
        pathname: "/dojo/exams/2kyu",
      });
    }
  });

  it("sends publishing a game to the web", () => {
    expect(requirementTarget(RANK_REQUIREMENTS["1dan"][0]!)).toEqual({
      kind: "web",
      path: "/games/new/standard",
    });
  });
});

/**
 * The exam-problem strings, used only where the app dictionaries do not have
 * them yet (`addResourceBundle` without overwrite keeps the dictionary's own
 * string wherever it has one).
 */
const EXAM_PROBLEM_STRINGS = {
  ja: {
    ranks: {
      requirement: {
        examProblem: "{{rank}}の課題「{{problem}}」に合格する",
        examProblemNames: {
          position_memory: "ポジション記憶",
          puzzle: "パズル",
        },
      },
    },
  },
  en: {
    ranks: {
      requirement: {
        examProblem: "Pass the {{rank}} exam: {{problem}}",
        examProblemNames: {
          position_memory: "Position Memory",
          puzzle: "Puzzle",
        },
      },
    },
  },
};

describe("requirementLabel", () => {
  const t = i18next.createInstance();
  beforeAll(async () => {
    await t.init({
      lng: "ja",
      resources: { ja: { translation: ja }, en: { translation: en } },
    });
    for (const [lng, strings] of Object.entries(EXAM_PROBLEM_STRINGS)) {
      t.addResourceBundle(lng, "translation", strings, true, false);
    }
  });

  it("finds a string for every requirement in every rank", async () => {
    for (const lng of ["ja", "en"]) {
      await t.changeLanguage(lng);
      for (const requirement of ALL_REQUIREMENTS) {
        const label = requirementLabel(requirement, t.t);
        expect(label).not.toMatch(/ranks\.|\{\{/);
      }
    }
  });

  it("names an exam problem with its rank and kind", async () => {
    await t.changeLanguage("en");
    expect(requirementLabel(RANK_REQUIREMENTS["2kyu"][1]!, t.t)).toBe(
      "Pass the 2nd Kyū exam: Puzzle",
    );
  });

  it("reads a challenge score with its piece and threshold", async () => {
    await t.changeLanguage("ja");
    expect(requirementLabel(RANK_REQUIREMENTS["4kyu"][1]!, t.t)).toBe(
      "合法手チャレンジ（ナイト）でスコア20以上",
    );
  });
});

describe("mobileRankRequirements", () => {
  it("asks exactly the shared requirements", () => {
    for (const slug of EARNED_RANK_SLUGS) {
      expect(mobileRankRequirements(slug)).toBe(RANK_REQUIREMENTS[slug]);
    }
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
