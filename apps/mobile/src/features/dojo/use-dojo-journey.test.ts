import { describe, expect, it, vi } from "vitest";
import { buildRankJourney } from "@blindfold-chess/features/dojo-journey";

// The hook's own dependencies (navigation, the account store, the API
// client) do not load under vitest; these tests cover the pure composition.
vi.mock("expo-router", () => ({ useFocusEffect: vi.fn() }));
vi.mock("../../auth/use-auth", () => ({ useAuth: vi.fn() }));
vi.mock("./dojo-api", () => ({
  fetchDojoProgress: vi.fn(),
  postGuideSteps: vi.fn(),
}));

import { EMPTY_DEVICE_PROGRESS, type DeviceProgress } from "./progress-store";
import type { ServerDojoProgress } from "./progress-sync";
import { GUIDE_PAGE_COUNTS, composeJourneyInput } from "./use-dojo-journey";

const device: DeviceProgress = {
  guest: {
    steps: ["guide:5kyu:1"],
    attempts: ["square_colors:default"],
  },
  byUser: {
    u1: { pendingSteps: ["guide:5kyu:2"] },
    u2: { pendingSteps: ["guide:4kyu:1"] },
  },
  guestImported: true,
};

const server: ServerDojoProgress = {
  userId: "u1",
  achievedRanks: ["5kyu"],
  bestScores: [{ menuType: "legal_moves", leaderboardKey: "king", score: 3 }],
  completedSteps: ["guide:mukyu:1"],
};

describe("composeJourneyInput", () => {
  it("signed in, joins the server's steps with that user's pending steps", () => {
    const input = composeJourneyInput({
      userId: "u1",
      highest: "5kyu",
      server,
      device,
    });
    expect([...input.completedSteps].sort()).toEqual([
      "guide:5kyu:2",
      "guide:mukyu:1",
    ]);
    expect(input.bestScores).toBe(server.bestScores);
    expect(input.highest).toBe("5kyu");
  });

  it("signed in, counts the device's challenge marks as practised", () => {
    const input = composeJourneyInput({
      userId: "u1",
      highest: undefined,
      server,
      device,
    });
    expect([...input.attemptedChallenges]).toEqual(["square_colors:default"]);
  });

  it("ignores a server record read for another user", () => {
    const input = composeJourneyInput({
      userId: "u2",
      highest: undefined,
      server,
      device,
    });
    expect([...input.completedSteps]).toEqual(["guide:4kyu:1"]);
    expect(input.bestScores).toEqual([]);
  });

  it("signed out, reads the guest's marks and no best scores", () => {
    const input = composeJourneyInput({
      userId: undefined,
      highest: undefined,
      server,
      device,
    });
    expect([...input.completedSteps]).toEqual(["guide:5kyu:1"]);
    expect([...input.attemptedChallenges]).toEqual(["square_colors:default"]);
    expect(input.bestScores).toEqual([]);
  });

  it("starts empty before anything is read", () => {
    const input = composeJourneyInput({
      userId: undefined,
      highest: undefined,
      server: undefined,
      device: EMPTY_DEVICE_PROGRESS,
    });
    const journey = buildRankJourney("5kyu", input);
    expect(journey.steps.every((step) => !step.done)).toBe(true);
  });
});

describe("GUIDE_PAGE_COUNTS", () => {
  it("counts the pages of each bundled guide", () => {
    expect(GUIDE_PAGE_COUNTS).toMatchObject({
      mukyu: 3,
      "5kyu": 2,
      "4kyu": 4,
      "3kyu": 8,
      "2kyu": 4,
      "1kyu": 3,
    });
    expect(GUIDE_PAGE_COUNTS["1dan"]).toBeUndefined();
  });
});
