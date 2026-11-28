import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../auth/api-client", () => ({
  callMobileApi: vi.fn(),
}));

import { callMobileApi } from "../../auth/api-client";
import { fetchRecordsDashboard, fetchRecordsResults } from "./records-api";

const api = vi.mocked(callMobileApi);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const run = {
  id: "r1",
  menuType: "legal_moves",
  leaderboardKey: "knight",
  score: 12,
  incorrectAnswers: 1,
  timeTaken: 60,
  createdAt: "2026-11-25T10:00:00.000Z",
};

beforeEach(() => {
  api.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-28T12:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("fetchRecordsDashboard", () => {
  it("asks for the period's edges and the menu, and parses the runs' dates", async () => {
    api.mockResolvedValue(
      json({
        availableMenuTypes: ["legal_moves", "not_a_menu"],
        selectedMenu: "legal_moves",
        sessions: [run],
        previousSessions: [],
      }),
    );

    const result = await fetchRecordsDashboard("thisWeek", "legal_moves");

    const path = api.mock.calls[0]?.[0] ?? "";
    const query = new URLSearchParams(path.split("?")[1]);
    expect(path.startsWith("/records/dashboard?")).toBe(true);
    expect(query.get("menu")).toBe("legal_moves");
    // This week runs from Monday (local midnight) to the next Monday; the
    // previous period is the week before.
    expect(new Date(query.get("currentStart") ?? "")).toEqual(
      new Date("2026-11-23T00:00:00"),
    );
    expect(new Date(query.get("previousStart") ?? "")).toEqual(
      new Date("2026-11-16T00:00:00"),
    );
    expect(result).toEqual({
      availableMenuTypes: ["legal_moves"],
      selectedMenu: "legal_moves",
      sessions: [{ ...run, createdAt: new Date(run.createdAt) }],
      previousSessions: [],
    });
  });

  it("leaves the menu out when the player has not picked one", async () => {
    api.mockResolvedValue(
      json({
        availableMenuTypes: [],
        selectedMenu: null,
        sessions: [],
        previousSessions: [],
      }),
    );
    await fetchRecordsDashboard("lastMonth", null);
    expect(api.mock.calls[0]?.[0]).not.toContain("menu=");
  });

  it("drops a run with a malformed field rather than the whole answer", async () => {
    api.mockResolvedValue(
      json({
        availableMenuTypes: ["legal_moves"],
        selectedMenu: "legal_moves",
        sessions: [run, { ...run, id: "r2", createdAt: "not a date" }],
        previousSessions: [],
      }),
    );
    const result = await fetchRecordsDashboard("thisWeek", null);
    expect("error" in result ? [] : result.sessions.map((s) => s.id)).toEqual([
      "r1",
    ]);
  });

  it("reports a failed request, a signed-out user and a body of the wrong shape", async () => {
    api.mockResolvedValueOnce(json({ error: "x" }, 500));
    expect(await fetchRecordsDashboard("thisWeek", null)).toEqual({
      error: "serverError",
    });
    api.mockResolvedValueOnce("signedOut");
    expect(await fetchRecordsDashboard("thisWeek", null)).toEqual({
      error: "signedOut",
    });
    api.mockResolvedValueOnce(json({ sessions: "nope" }));
    expect(await fetchRecordsDashboard("thisWeek", null)).toEqual({
      error: "serverError",
    });
  });
});

describe("fetchRecordsResults", () => {
  it("sends the key only with a menu, and reads back the key used", async () => {
    api.mockResolvedValue(
      json({
        items: [run],
        page: 1,
        totalPages: 2,
        menu: "legal_moves",
        key: "knight",
        availableMenuTypes: ["legal_moves"],
      }),
    );

    const result = await fetchRecordsResults({
      page: 1,
      menu: "legal_moves",
      key: null,
    });

    expect(api).toHaveBeenCalledWith(
      "/records/results?page=1&menu=legal_moves",
    );
    expect(result).toMatchObject({ key: "knight", totalPages: 2 });

    await fetchRecordsResults({ page: 2, menu: null, key: "white" });
    expect(api).toHaveBeenLastCalledWith("/records/results?page=2");
  });
});
