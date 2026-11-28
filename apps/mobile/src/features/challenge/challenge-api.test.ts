import type { RemoteChallengePort } from "@blindfold-chess/features/challenge-attempt";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The real module pulls in the Supabase client and React Native, which do
// not load under vitest; these tests only reach the 2xx paths, so
// errorCodeOf is never called.
vi.mock("../../auth/api-client", () => ({
  callMobileApi: vi.fn(),
  errorCodeOf: vi.fn(),
}));

import { callMobileApi } from "../../auth/api-client";
import { beginChallenge, finishChallenge } from "./challenge-api";

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

const beginBody = { attemptId: "a1", first: { sequence: 0, question: "e4" } };

beforeEach(() => {
  api.mockReset();
});

describe("beginChallenge", () => {
  it("returns a recorded attempt for a well-formed body", async () => {
    api.mockResolvedValue(json(beginBody));
    const result = await beginChallenge("square_colors", {});
    expect(result).toMatchObject({
      kind: "recorded",
      attemptId: "a1",
      remote: { first: beginBody.first },
    });
  });

  it("resolves to a failed error, not a rejection, when a 2xx body is not JSON", async () => {
    api.mockResolvedValue(portalPage());
    await expect(beginChallenge("square_colors", {})).resolves.toEqual({
      kind: "error",
      reason: "failed",
    });
  });

  it("resolves to a failed error when a 2xx body has no attemptId", async () => {
    api.mockResolvedValue(json({ first: beginBody.first }));
    await expect(beginChallenge("square_colors", {})).resolves.toEqual({
      kind: "error",
      reason: "failed",
    });
  });

  it("resolves to a failed error when the first question has no sequence", async () => {
    api.mockResolvedValue(json({ attemptId: "a1", first: { question: "e4" } }));
    await expect(beginChallenge("square_colors", {})).resolves.toEqual({
      kind: "error",
      reason: "failed",
    });
  });
});

describe("submitAnswer of a recorded attempt", () => {
  async function port(): Promise<RemoteChallengePort<string>> {
    api.mockResolvedValueOnce(json(beginBody));
    const result = await beginChallenge<string>("square_colors", {});
    if (result.kind !== "recorded") throw new Error("expected recorded");
    return result.remote;
  }

  it("returns an accepted answer", async () => {
    const remote = await port();
    const accepted = {
      status: "accepted",
      correct: true,
      elapsedMs: 1200,
      next: { sequence: 1, question: "d4" },
    };
    api.mockResolvedValueOnce(json(accepted));
    await expect(remote.submitAnswer(0, "white")).resolves.toEqual(accepted);
  });

  // The shared session hook retries only a thrown answer, so an unreadable
  // 2xx must throw rather than resolve to a made-up response.
  it("throws when a 2xx body is not JSON, so the session hook retries", async () => {
    const remote = await port();
    api.mockResolvedValueOnce(portalPage());
    await expect(remote.submitAnswer(0, "white")).rejects.toThrow();
  });

  it("throws when a 2xx body is not a known answer response", async () => {
    const remote = await port();
    api.mockResolvedValueOnce(json({ status: "accepted", correct: "yes" }));
    await expect(remote.submitAnswer(0, "white")).rejects.toThrow();
  });
});

describe("finishChallenge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Runs finish to completion, skipping the resend waits. */
  async function finish() {
    const result = finishChallenge("a1");
    await vi.runAllTimersAsync();
    return result;
  }

  it("returns the granted ranks of a recorded result", async () => {
    api.mockResolvedValue(
      json({ status: "done", success: true, grantedRanks: [{ slug: "pawn" }] }),
    );
    await expect(finish()).resolves.toEqual({
      kind: "recorded",
      grantedRanks: [{ slug: "pawn" }],
      summary: null,
    });
  });

  it("returns the EXP and record summary of a recorded result", async () => {
    const summary = {
      exp: { earnedExp: 12, level: 3, levelUp: true, progressPercent: 40 },
      record: {
        status: "new-best",
        currentScore: 9,
        previousBestScore: 7,
        previousLastScore: 5,
        diffFromLast: 4,
      },
      menuType: "square_colors",
    };
    api.mockResolvedValue(
      json({ status: "done", success: true, grantedRanks: [], summary }),
    );
    await expect(finish()).resolves.toEqual({
      kind: "recorded",
      grantedRanks: [],
      summary,
    });
  });

  it("keeps a recorded result whose summary it cannot read, without the summary", async () => {
    api.mockResolvedValue(
      json({
        status: "done",
        success: true,
        grantedRanks: [],
        summary: { exp: "lots", record: {}, menuType: "square_colors" },
      }),
    );
    await expect(finish()).resolves.toEqual({
      kind: "recorded",
      grantedRanks: [],
      summary: null,
    });
  });

  it("returns notRecorded when the server declined the result", async () => {
    api.mockResolvedValue(
      json({ status: "done", success: false, error: "implausible_speed" }),
    );
    await expect(finish()).resolves.toEqual({ kind: "notRecorded" });
  });

  it("resends after a non-JSON 2xx and returns the result of the next try", async () => {
    api
      .mockResolvedValueOnce(portalPage())
      .mockResolvedValue(
        json({ status: "done", success: true, grantedRanks: [] }),
      );
    await expect(finish()).resolves.toEqual({
      kind: "recorded",
      grantedRanks: [],
      summary: null,
    });
    expect(api).toHaveBeenCalledTimes(2);
  });

  it("resolves to failed, not a rejection, when every 2xx body is not JSON", async () => {
    api.mockImplementation(async () => portalPage());
    await expect(finish()).resolves.toEqual({ kind: "failed" });
  });

  it("resolves to failed when every 2xx body has an unknown shape", async () => {
    api.mockImplementation(async () => json({ status: "pending" }));
    await expect(finish()).resolves.toEqual({ kind: "failed" });
  });
});
