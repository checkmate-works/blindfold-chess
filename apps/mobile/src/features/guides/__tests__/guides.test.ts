import { existsSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  GUIDE_RANKS,
  POSITION_MEMORY_TUTORIAL_FEN,
  adjacentGuideRanks,
  formatWebMessage,
  guideContent,
  guideLinkTarget,
  paragraphKind,
  paragraphTexts,
  parseProse,
} from "../content";
import { GUIDE_CONTENT } from "../generated/guides";
import { GUIDE_VISUAL_AIDS } from "../generated/visual-aids";
import { pieceReach, squaresBetween } from "../visual-aids/geometry";

const LOCALES = Object.keys(GUIDE_CONTENT) as (keyof typeof GUIDE_CONTENT)[];

/** Every `<rank>:<page>:<paragraph>` the English guides have. */
const PARAGRAPH_KEYS = new Set(
  Object.entries(GUIDE_CONTENT.en.guides).flatMap(([rank, guide]) =>
    guide.pages.flatMap((page, i) =>
      page.paragraphs.map((_, j) => `${rank}:${i + 1}:${j}`),
    ),
  ),
);

describe("the bundled guides", () => {
  it("has the four languages the web has", () => {
    expect([...LOCALES].sort()).toEqual(["en", "es", "ja", "pt-BR"]);
  });

  it("has a guide for every rank below 1dan, and none for 1dan", () => {
    expect(GUIDE_RANKS).toEqual([
      "mukyu",
      "5kyu",
      "4kyu",
      "3kyu",
      "2kyu",
      "1kyu",
    ]);
  });

  // Visual aids and links are keyed by page and paragraph, so a language
  // whose pages broke differently would put a board after the wrong text.
  it.each(LOCALES)("%s has the same ranks, pages and paragraphs as en", (l) => {
    const shape = (locale: keyof typeof GUIDE_CONTENT) =>
      Object.fromEntries(
        Object.entries(GUIDE_CONTENT[locale].guides).map(([rank, guide]) => [
          rank,
          guide.pages.map((page) => page.paragraphs.length),
        ]),
      );
    expect(shape(l)).toEqual(shape("en"));
  });

  it.each(LOCALES)("%s has only paragraph shapes the renderer draws", (l) => {
    for (const [rank, guide] of Object.entries(GUIDE_CONTENT[l].guides)) {
      expect(guide.format, rank).toBe("flat");
      guide.pages.forEach((page, i) =>
        page.paragraphs.forEach((paragraph, j) => {
          expect(paragraphKind(paragraph), `${rank}:${i + 1}:${j}`).not.toBe(
            null,
          );
          for (const text of paragraphTexts(paragraph)) {
            expect(text.trim(), `${rank}:${i + 1}:${j}`).not.toBe("");
          }
        }),
      );
    }
  });

  it("uses every paragraph shape there is", () => {
    const kinds = new Set(
      Object.values(GUIDE_CONTENT.en.guides).flatMap((guide) =>
        guide.pages.flatMap((page) => page.paragraphs.map(paragraphKind)),
      ),
    );
    expect([...kinds].sort()).toEqual(["heading", "list", "text"]);
  });

  it("places every visual aid after a paragraph that exists", () => {
    for (const key of Object.keys(GUIDE_VISUAL_AIDS)) {
      expect(PARAGRAPH_KEYS.has(key), key).toBe(true);
    }
  });

  it.each(LOCALES)("%s labels every link card, after a real paragraph", (l) => {
    const links = GUIDE_CONTENT[l].links;
    expect(Object.keys(links).sort()).toEqual(
      Object.keys(GUIDE_CONTENT.en.links).sort(),
    );
    for (const [key, link] of Object.entries(links)) {
      expect(PARAGRAPH_KEYS.has(key), key).toBe(true);
      expect(link.label.trim(), key).not.toBe("");
      expect(link.href.startsWith("/"), key).toBe(true);
    }
  });
});

describe("guideContent", () => {
  it("falls back from a region to its language, then to English", () => {
    expect(guideContent("pt-BR")).toBe(GUIDE_CONTENT["pt-BR"]);
    expect(guideContent("pt")).toBe(GUIDE_CONTENT["pt-BR"]);
    expect(guideContent("ja")).toBe(GUIDE_CONTENT.ja);
    expect(guideContent("fr")).toBe(GUIDE_CONTENT.en);
  });
});

describe("adjacentGuideRanks", () => {
  it("steps along the guided ranks and stops at the ends", () => {
    expect(adjacentGuideRanks("mukyu")).toEqual({
      prev: undefined,
      next: "5kyu",
    });
    expect(adjacentGuideRanks("1kyu")).toEqual({
      prev: "2kyu",
      next: undefined,
    });
    expect(adjacentGuideRanks("1dan")).toEqual({});
  });
});

describe("formatWebMessage", () => {
  it("fills placeholders and keeps a rich-text tag's text", () => {
    expect(
      formatWebMessage("<link>{rankName}</link>の解説", { rankName: "5級" }),
    ).toBe("5級の解説");
    expect(formatWebMessage("{a} and {b}", { a: "x" })).toBe("x and {b}");
  });
});

describe("parseProse", () => {
  it("makes a bundled glossary term tappable", () => {
    expect(parseProse("a [[tabiya|Tabia]] b")).toEqual([
      { type: "text", value: "a " },
      { type: "term", slug: "tabiya", label: "Tabia" },
      { type: "text", value: " b" },
    ]);
  });

  it("reads an unknown term as its label, and plain text as itself", () => {
    expect(parseProse("x [[no-such-term|Label]] y")).toEqual([
      { type: "text", value: "x Label y" },
    ]);
    expect(parseProse("plain")).toEqual([{ type: "text", value: "plain" }]);
  });
});

describe("guideLinkTarget", () => {
  it("opens a bundled learn article in the app", () => {
    expect(guideLinkTarget("/learn/moves/king-movement")).toEqual({
      kind: "app",
      href: "/learn/king-movement",
    });
  });

  it("opens an article the app does not bundle on the web", () => {
    expect(guideLinkTarget("/learn/moves/no-such-article")).toEqual({
      kind: "web",
      path: "/learn/moves/no-such-article",
    });
  });

  it("opens a practice's setup screen, by its route", () => {
    expect(guideLinkTarget("/practice/coordinate-quiz")).toEqual({
      kind: "app",
      href: "/practice/coordinate-quiz",
    });
    expect(guideLinkTarget("/practice/quadrants")).toEqual({
      kind: "app",
      href: "/practice/quadrants",
    });
  });

  it("opens another guide in the app", () => {
    expect(guideLinkTarget("/dojo/guides/5kyu")).toEqual({
      kind: "app",
      href: "/dojo/guides/5kyu",
    });
  });

  it("opens a position-memory problem as a session of that one problem", () => {
    const fen = "5rk1/5ppp/8/8/8/8/5PPP/5RK1 w - - 0 1";
    const token = btoa(fen)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const target = guideLinkTarget(`/practice/position-memory/custom/${token}`);
    expect(target.kind).toBe("app");
    if (target.kind !== "app") return;
    const [pathname, query] = target.href.split("?");
    expect(pathname).toBe("/practice/position-memory/session");
    const params = new URLSearchParams(query);
    expect(JSON.parse(params.get("problems") ?? "")).toEqual([fen]);
    expect(params.get("count")).toBe("1");
    expect(params.get("shuffle")).toBe("0");
    expect(params.get("from")).toBe("guide");
  });

  it("opens the position-memory tutorial as the Lucena problem on a 60 s clock", () => {
    const target = guideLinkTarget("/practice/position-memory/tutorial");
    expect(target.kind).toBe("app");
    if (target.kind !== "app") return;
    const [pathname, query] = target.href.split("?");
    expect(pathname).toBe("/practice/position-memory/session");
    const params = new URLSearchParams(query);
    expect(JSON.parse(params.get("problems") ?? "")).toEqual([
      POSITION_MEMORY_TUTORIAL_FEN,
    ]);
    expect(params.get("count")).toBe("1");
    expect(params.get("seconds")).toBe("60");
    expect(params.get("from")).toBe("guide");
  });

  it("opens a practice's tutorial as its setup screen with the help sheet up", () => {
    expect(guideLinkTarget("/practice/diagonal-quiz/tutorial")).toEqual({
      kind: "app",
      href: "/practice/diagonal-quiz?help=1",
    });
    // A module whose help is only how to play has no tutorial to show.
    expect(guideLinkTarget("/practice/coordinate-quiz/tutorial")).toEqual({
      kind: "web",
      path: "/practice/coordinate-quiz/tutorial",
    });
  });

  it("opens every guide's tutorial in the app", () => {
    const links = Object.values(GUIDE_CONTENT.en.links).filter((link) =>
      /^\/practice\/[^/]+\/tutorial$/.test(link.href),
    );
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(guideLinkTarget(link.href).kind).toBe("app");
    }
  });

  it("opens the AI-game setup from a guide's position", () => {
    const fen = "4k3/4p3/8/8/8/8/3PP3/4K3 w - - 0 1";
    const target = guideLinkTarget(
      `/games/new/position?fen=${encodeURIComponent(fen)}`,
    );
    expect(target.kind).toBe("app");
    if (target.kind !== "app") return;
    const [pathname, query] = target.href.split("?");
    expect(pathname).toBe("/play/ai-game");
    expect(new URLSearchParams(query).get("fen")).toBe(fen);
  });

  it("opens every guide's problem and position in the app", () => {
    const links = Object.values(GUIDE_CONTENT.en.links).filter(
      (link) =>
        link.href.startsWith("/practice/position-memory/custom/") ||
        link.href.startsWith("/games/new/position"),
    );
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(guideLinkTarget(link.href).kind).toBe("app");
    }
  });

  it("sends what the app does not have to the web", () => {
    for (const path of [
      "/practice/diagonal-quiz/tutorial/extra",
      "/practice/position-memory/tutorial/extra",
      "/practice/position-memory/custom/abc",
      "/practice/position-memory/custom/!!",
      "/repertoires",
      "/chunks/new",
      "/articles/switched-to-quadrant-method",
      "/games/new/position?fen=x",
      "/games/new/position",
    ]) {
      expect(guideLinkTarget(path)).toEqual({ kind: "web", path });
    }
  });

  it("resolves every link the guides have", () => {
    for (const link of Object.values(GUIDE_CONTENT.en.links)) {
      expect(["app", "web"]).toContain(guideLinkTarget(link.href).kind);
    }
  });
});

describe("the movement boards' squares", () => {
  // The web lists the squares by hand; the app derives them. These are the
  // web's lists for a piece on d4.
  it("matches the web's king, knight, bishop, rook and queen on d4", () => {
    const sorted = (s: string[]) => [...s].sort();
    expect(sorted(pieceReach("k", "d4"))).toEqual(
      sorted(["c3", "c4", "c5", "d3", "d5", "e3", "e4", "e5"]),
    );
    expect(sorted(pieceReach("n", "d4"))).toEqual(
      sorted(["c2", "c6", "b3", "b5", "e2", "e6", "f3", "f5"]),
    );
    const bishop = [
      "a1",
      "b2",
      "c3",
      "e5",
      "f6",
      "g7",
      "h8",
      "a7",
      "b6",
      "c5",
      "e3",
      "f2",
      "g1",
    ];
    const rook = [
      "a4",
      "b4",
      "c4",
      "e4",
      "f4",
      "g4",
      "h4",
      "d1",
      "d2",
      "d3",
      "d5",
      "d6",
      "d7",
      "d8",
    ];
    expect(sorted(pieceReach("b", "d4"))).toEqual(sorted(bishop));
    expect(sorted(pieceReach("r", "d4"))).toEqual(sorted(rook));
    expect(sorted(pieceReach("q", "d4"))).toEqual(sorted([...bishop, ...rook]));
  });

  it("walks a line end to end", () => {
    expect(squaresBetween("d7", "a4")).toEqual(["d7", "c6", "b5", "a4"]);
    expect(squaresBetween("a1", "a1")).toEqual(["a1"]);
  });
});

describe("the guide screen", () => {
  it("exists where the rank screen's row pushes it", () => {
    expect(
      existsSync(
        join(
          __dirname,
          "..",
          "..",
          "..",
          "app",
          "dojo",
          "guides",
          "[rank].tsx",
        ),
      ),
    ).toBe(true);
  });
});
