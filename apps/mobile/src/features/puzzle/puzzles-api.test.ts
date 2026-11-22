import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../auth/api-client", () => ({
  callMobileApi: vi.fn(),
}));

import { callMobileApi } from "../../auth/api-client";
import { fetchPuzzle, fetchPuzzleList } from "./puzzles-api";

const api = vi.mocked(callMobileApi);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** What a captive portal answers with: a 200 that is not JSON. */
const portalPage = () =>
  new Response("<html><body>Sign in to the Wi-Fi</body></html>", {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });

const summary = {
  id: "p1",
  title: "Mate in two",
  fen: "8/8/8/8/8/8/8/8 w - - 0 1",
};

beforeEach(() => {
  api.mockReset();
});

describe("fetchPuzzleList", () => {
  it("returns the daily and featured puzzles of a well-formed body", async () => {
    api.mockResolvedValue(json({ daily: summary, featured: [summary] }));
    await expect(fetchPuzzleList()).resolves.toEqual({
      daily: summary,
      featured: [summary],
    });
  });

  it("resolves to failed, not a rejection, when a 2xx body is not JSON", async () => {
    api.mockResolvedValue(portalPage());
    await expect(fetchPuzzleList()).resolves.toBe("failed");
  });

  it("resolves to failed when a 2xx body has no featured array", async () => {
    api.mockResolvedValue(json({ daily: null, featured: "nope" }));
    await expect(fetchPuzzleList()).resolves.toBe("failed");
  });

  it("resolves to failed when the daily puzzle is malformed", async () => {
    api.mockResolvedValue(json({ daily: { id: 1 }, featured: [] }));
    await expect(fetchPuzzleList()).resolves.toBe("failed");
  });

  it("drops featured entries that miss a field instead of failing the list", async () => {
    api.mockResolvedValue(
      json({ daily: null, featured: [summary, { id: "p2" }] }),
    );
    await expect(fetchPuzzleList()).resolves.toEqual({
      daily: null,
      featured: [summary],
    });
  });

  it("resolves to failed when the request does not reach the server", async () => {
    api.mockResolvedValue("offline");
    await expect(fetchPuzzleList()).resolves.toBe("failed");
  });
});

describe("fetchPuzzle", () => {
  const puzzle = {
    ...summary,
    description: null,
    solutions: [[{ san: "Qh7+", note: null }]],
  };

  it("returns a well-formed puzzle", async () => {
    api.mockResolvedValue(json(puzzle));
    await expect(fetchPuzzle("p1")).resolves.toEqual(puzzle);
  });

  it("returns notFound on a 404", async () => {
    api.mockResolvedValue(json({ error: "notFound" }, 404));
    await expect(fetchPuzzle("p1")).resolves.toBe("notFound");
  });

  it("resolves to failed, not a rejection, when a 2xx body is not JSON", async () => {
    api.mockResolvedValue(portalPage());
    await expect(fetchPuzzle("p1")).resolves.toBe("failed");
  });

  it("resolves to failed when a 2xx body lacks the solutions", async () => {
    api.mockResolvedValue(json({ ...summary, description: null }));
    await expect(fetchPuzzle("p1")).resolves.toBe("failed");
  });

  it("resolves to failed when a solution move has no san", async () => {
    api.mockResolvedValue(json({ ...puzzle, solutions: [[{ note: null }]] }));
    await expect(fetchPuzzle("p1")).resolves.toBe("failed");
  });
});
