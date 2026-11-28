import { afterEach, describe, expect, it, vi } from "vitest";

import {
  NOTICE_CLAIM_WINDOW_MS,
  getScreenNotice,
  postScreenNotice,
  subscribeScreenNotice,
  takeScreenNotice,
} from "./screen-notice";

afterEach(() => {
  takeScreenNotice();
});

describe("screen notice", () => {
  it("is taken once: a second screen finds nothing", () => {
    postScreenNotice({ kind: "gameSaved", gameId: "game-1" }, 1000);

    expect(takeScreenNotice(1500)).toEqual({
      kind: "gameSaved",
      gameId: "game-1",
      postedAt: 1000,
    });
    expect(takeScreenNotice(1500)).toBeNull();
    expect(getScreenNotice()).toBeNull();
  });

  it("drops a notice nobody took within the claim window", () => {
    postScreenNotice({ kind: "gameSaved", gameId: "game-1" }, 1000);

    expect(takeScreenNotice(1000 + NOTICE_CLAIM_WINDOW_MS + 1)).toBeNull();
    expect(getScreenNotice()).toBeNull();
  });

  it("is still fresh at the end of the claim window", () => {
    postScreenNotice({ kind: "gameSaved", gameId: "game-1" }, 1000);

    expect(takeScreenNotice(1000 + NOTICE_CLAIM_WINDOW_MS)?.kind).toBe(
      "gameSaved",
    );
  });

  it("replaces a notice not yet taken with the newer one", () => {
    postScreenNotice({ kind: "gameSaved", gameId: "game-1" }, 1000);
    postScreenNotice({ kind: "sessionQuit" }, 1100);

    expect(takeScreenNotice(1200)).toEqual({
      kind: "sessionQuit",
      postedAt: 1100,
    });
  });

  it("tells subscribers when a notice is posted and when it is taken", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeScreenNotice(listener);

    postScreenNotice({ kind: "gameSaved", gameId: "game-1" }, 1000);
    takeScreenNotice(1000);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    postScreenNotice({ kind: "gameSaved", gameId: "game-2" }, 1000);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("taking nothing tells nobody", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeScreenNotice(listener);

    expect(takeScreenNotice()).toBeNull();
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});
