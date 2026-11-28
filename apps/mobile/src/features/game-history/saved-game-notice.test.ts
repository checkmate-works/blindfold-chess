import { afterEach, describe, expect, it, vi } from "vitest";

import {
  NOTICE_CLAIM_WINDOW_MS,
  getSavedGameNotice,
  postSavedGameNotice,
  subscribeSavedGameNotice,
  takeSavedGameNotice,
} from "./saved-game-notice";

afterEach(() => {
  takeSavedGameNotice();
});

describe("saved game notice", () => {
  it("is taken once: a second screen finds nothing", () => {
    postSavedGameNotice("game-1", 1000);

    expect(takeSavedGameNotice(1500)).toEqual({
      gameId: "game-1",
      postedAt: 1000,
    });
    expect(takeSavedGameNotice(1500)).toBeNull();
    expect(getSavedGameNotice()).toBeNull();
  });

  it("drops a notice nobody took within the claim window", () => {
    postSavedGameNotice("game-1", 1000);

    expect(takeSavedGameNotice(1000 + NOTICE_CLAIM_WINDOW_MS + 1)).toBeNull();
    expect(getSavedGameNotice()).toBeNull();
  });

  it("is still fresh at the end of the claim window", () => {
    postSavedGameNotice("game-1", 1000);

    expect(takeSavedGameNotice(1000 + NOTICE_CLAIM_WINDOW_MS)?.gameId).toBe(
      "game-1",
    );
  });

  it("replaces a notice not yet taken with the newer game's", () => {
    postSavedGameNotice("game-1", 1000);
    postSavedGameNotice("game-2", 1100);

    expect(takeSavedGameNotice(1200)?.gameId).toBe("game-2");
  });

  it("tells subscribers when a notice is posted and when it is taken", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSavedGameNotice(listener);

    postSavedGameNotice("game-1", 1000);
    takeSavedGameNotice(1000);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    postSavedGameNotice("game-2", 1000);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("taking nothing tells nobody", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSavedGameNotice(listener);

    expect(takeSavedGameNotice()).toBeNull();
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});
