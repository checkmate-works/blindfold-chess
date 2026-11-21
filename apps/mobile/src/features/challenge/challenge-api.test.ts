import type { RemoteChallengePort } from "@blindfold-chess/features/challenge-attempt";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The real module pulls in the Supabase client and React Native, which do
// not load under vitest; these tests only reach the 2xx paths, so
// errorCodeOf is never called.
vi.mock("../../auth/api-client", () => ({
  callMobileApi: vi.fn(),
  errorCodeOf: vi.fn(),
}));

import { callMobileApi } from "../../auth/api-client";
import { beginChallenge } from "./challenge-api";

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
