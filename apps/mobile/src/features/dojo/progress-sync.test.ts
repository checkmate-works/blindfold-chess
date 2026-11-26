import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./dojo-api", () => ({
  fetchDojoProgress: vi.fn(),
  postGuideSteps: vi.fn(),
}));

import { fetchDojoProgress, postGuideSteps } from "./dojo-api";
import {
  markGuestAttempt,
  markGuestStep,
  markPendingStep,
  pendingStepsOf,
  readDeviceProgress,
  resetDeviceProgressForTests,
} from "./progress-store";
import {
  getServerDojoProgress,
  resetServerDojoProgressForTests,
  syncDojoProgress,
} from "./progress-sync";

const post = vi.mocked(postGuideSteps);
const fetchDojo = vi.mocked(fetchDojoProgress);

const record = (completedSteps: string[]) => ({
  achievedRanks: [],
  bestScores: [],
  completedSteps,
});

/** A server that records every guide key it is sent and refuses the rest. */
function acceptGuideKeys() {
  post.mockImplementation((steps) =>
    Promise.resolve({
      completed: steps.filter((s) => s.startsWith("guide:")),
      rejected: steps.filter((s) => !s.startsWith("guide:")),
    }),
  );
}

beforeEach(() => {
  resetDeviceProgressForTests();
  resetServerDojoProgressForTests();
  post.mockReset();
  fetchDojo.mockReset();
  fetchDojo.mockResolvedValue(record([]));
});

describe("syncDojoProgress", () => {
  it("imports the guest's pages into the first account only, once", async () => {
    acceptGuideKeys();
    await markGuestStep("guide:5kyu:1");

    await syncDojoProgress("u1");
    expect(post).toHaveBeenCalledWith(["guide:5kyu:1"]);

    post.mockClear();
    await markGuestStep("guide:5kyu:2");
    await syncDojoProgress("u2");
    expect(post).not.toHaveBeenCalled();
    expect((await readDeviceProgress()).guest.steps).toEqual(["guide:5kyu:2"]);
  });

  it("never sends the guest's challenge marks", async () => {
    acceptGuideKeys();
    await markGuestAttempt("legal_moves:king");
    await syncDojoProgress("u1");
    expect(post).not.toHaveBeenCalled();
    expect((await readDeviceProgress()).guest.attempts).toEqual([
      "legal_moves:king",
    ]);
  });

  it("sends only the signed-in user's pending steps, never another user's", async () => {
    acceptGuideKeys();
    await markPendingStep("u1", "guide:5kyu:1");
    await markPendingStep("u2", "guide:4kyu:1");

    await syncDojoProgress("u1");

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(["guide:5kyu:1"]);
    const device = await readDeviceProgress();
    expect(pendingStepsOf(device, "u1")).toEqual([]);
    expect(pendingStepsOf(device, "u2")).toEqual(["guide:4kyu:1"]);
  });

  it("drops rejected keys from the pending steps as well as completed ones", async () => {
    acceptGuideKeys();
    await markPendingStep("u1", "guide:5kyu:1");
    await markPendingStep("u1", "exam:2kyu:puzzle");

    expect(await syncDojoProgress("u1")).toBe("synced");
    expect(pendingStepsOf(await readDeviceProgress(), "u1")).toEqual([]);
  });

  it("keeps the pending steps when the request fails", async () => {
    post.mockResolvedValue({ error: "offline" });
    await markPendingStep("u1", "guide:5kyu:1");

    expect(await syncDojoProgress("u1")).toBe("failed");
    expect(pendingStepsOf(await readDeviceProgress(), "u1")).toEqual([
      "guide:5kyu:1",
    ]);
    expect(fetchDojo).not.toHaveBeenCalled();
  });

  it("sends at most 100 keys per request", async () => {
    acceptGuideKeys();
    for (let i = 0; i < 101; i++) {
      await markPendingStep("u1", `guide:3kyu:${i + 1}`);
    }
    await syncDojoProgress("u1");
    expect(post.mock.calls.map(([steps]) => steps.length)).toEqual([100, 1]);
  });

  it("keeps the server's record with the user it was read for", async () => {
    fetchDojo.mockResolvedValue(record(["exam:2kyu:puzzle"]));
    await syncDojoProgress("u1");
    expect(getServerDojoProgress()).toMatchObject({
      userId: "u1",
      completedSteps: ["exam:2kyu:puzzle"],
    });
  });

  it("joins a sync already running for the same user instead of starting another", async () => {
    let release: () => void = () => {};
    post.mockImplementation(
      (steps) =>
        new Promise((resolve) => {
          release = () => resolve({ completed: [...steps], rejected: [] });
        }),
    );
    await markPendingStep("u1", "guide:5kyu:1");

    const first = syncDojoProgress("u1");
    const second = syncDojoProgress("u1");
    expect(second).toBe(first);
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    release();
    await first;
    // The call that joined asks for one more sync once the first is over,
    // and the first one's pages are not sent again.
    await vi.waitFor(() => expect(fetchDojo).toHaveBeenCalledTimes(2));
    expect(post).toHaveBeenCalledTimes(1);
  });
});
