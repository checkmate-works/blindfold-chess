import { beforeEach, describe, expect, it, vi } from "vitest";

// The real module loads the Supabase client; `errorCodeOf` only reads the
// body's `error`, so it is restated here.
vi.mock("../../auth/api-client", () => ({
  callMobileApi: vi.fn(),
  errorCodeOf: async (response: Response) => {
    const body = (await response.json().catch(() => undefined)) as
      { error?: unknown } | undefined;
    return typeof body?.error === "string" ? body.error : undefined;
  },
}));

import { callMobileApi } from "../../auth/api-client";
import { fetchLikeState, likePath, toggleLike } from "./likes-api";

const api = vi.mocked(callMobileApi);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const puzzle = { kind: "puzzle", id: "p 1" } as const;
const announcement = {
  kind: "announcement",
  slug: "new-dojo",
  locale: "pt-BR",
} as const;

beforeEach(() => {
  api.mockReset();
});

describe("likePath", () => {
  it("encodes the puzzle id and the announcement's locale", () => {
    expect(likePath(puzzle)).toBe("/puzzles/p%201/like");
    expect(likePath(announcement)).toBe(
      "/announcements/new-dojo/like?locale=pt-BR",
    );
  });
});

describe("fetchLikeState", () => {
  it("reads without a token when signed out", async () => {
    api.mockResolvedValue(json({ liked: false, likeCount: 2 }));

    await expect(fetchLikeState(puzzle, false)).resolves.toEqual({
      liked: false,
      likeCount: 2,
    });
    expect(api).toHaveBeenCalledWith("/puzzles/p%201/like", {
      anonymous: true,
    });
  });

  it("is failed for a body without the fields", async () => {
    api.mockResolvedValue(json({ liked: "yes" }));
    await expect(fetchLikeState(puzzle, true)).resolves.toBe("failed");
  });
});

describe("toggleLike", () => {
  it("returns the server's state", async () => {
    api.mockResolvedValue(json({ liked: true, likeCount: 3 }));

    await expect(toggleLike(announcement)).resolves.toEqual({
      liked: true,
      likeCount: 3,
    });
    expect(api).toHaveBeenCalledWith(
      "/announcements/new-dojo/like?locale=pt-BR",
      { method: "POST" },
    );
  });

  it("tells a missing username apart from other refusals", async () => {
    api.mockResolvedValue(json({ error: "profileRequired" }, 403));
    await expect(toggleLike(puzzle)).resolves.toBe("profileRequired");

    api.mockResolvedValue(json({ error: "blocked" }, 403));
    await expect(toggleLike(puzzle)).resolves.toBe("failed");
  });

  it("passes signedOut through and treats offline as failed", async () => {
    api.mockResolvedValue("signedOut");
    await expect(toggleLike(puzzle)).resolves.toBe("signedOut");

    api.mockResolvedValue("offline");
    await expect(toggleLike(puzzle)).resolves.toBe("failed");
  });
});
