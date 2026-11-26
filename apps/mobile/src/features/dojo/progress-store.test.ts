import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it } from "vitest";

import {
  DOJO_PROGRESS_STORAGE_KEY,
  EMPTY_DEVICE_PROGRESS,
  markGuestStep,
  markPendingStep,
  parseDeviceProgress,
  pendingStepsOf,
  readDeviceProgress,
  resetDeviceProgressForTests,
  withGuestAttempt,
  withGuestImported,
  withGuestStep,
  withPendingStep,
  withoutSettledSteps,
  type DeviceProgress,
} from "./progress-store";

const progressWith = (patch: Partial<DeviceProgress>): DeviceProgress => ({
  ...EMPTY_DEVICE_PROGRESS,
  ...patch,
});

describe("parseDeviceProgress", () => {
  it("reads an unreadable value as empty", () => {
    expect(parseDeviceProgress(undefined)).toEqual(EMPTY_DEVICE_PROGRESS);
    expect(parseDeviceProgress("garbage")).toEqual(EMPTY_DEVICE_PROGRESS);
    expect(parseDeviceProgress([1, 2])).toEqual(EMPTY_DEVICE_PROGRESS);
  });

  it("keeps the well-formed parts and drops the rest", () => {
    expect(
      parseDeviceProgress({
        guest: { steps: ["guide:5kyu:1", 3], attempts: "nope" },
        byUser: { u1: { pendingSteps: ["guide:4kyu:2"] }, u2: 7 },
        guestImported: "yes",
      }),
    ).toEqual({
      guest: { steps: ["guide:5kyu:1"], attempts: [] },
      byUser: { u1: { pendingSteps: ["guide:4kyu:2"] } },
      guestImported: false,
    });
  });
});

describe("marking steps", () => {
  it("adds a guest page and a guest challenge once each", () => {
    let p = withGuestStep(EMPTY_DEVICE_PROGRESS, "guide:5kyu:1");
    p = withGuestStep(p, "guide:5kyu:1");
    p = withGuestAttempt(p, "legal_moves:king");
    p = withGuestAttempt(p, "legal_moves:king");
    expect(p.guest).toEqual({
      steps: ["guide:5kyu:1"],
      attempts: ["legal_moves:king"],
    });
  });

  it("keeps each user's pending steps apart", () => {
    let p = withPendingStep(EMPTY_DEVICE_PROGRESS, "u1", "guide:5kyu:1");
    p = withPendingStep(p, "u2", "guide:4kyu:1");
    expect(pendingStepsOf(p, "u1")).toEqual(["guide:5kyu:1"]);
    expect(pendingStepsOf(p, "u2")).toEqual(["guide:4kyu:1"]);
    expect(p.guest.steps).toEqual([]);
  });

  it("returns the same object when nothing changes", () => {
    const p = withGuestStep(EMPTY_DEVICE_PROGRESS, "guide:5kyu:1");
    expect(withGuestStep(p, "guide:5kyu:1")).toBe(p);
    expect(withoutSettledSteps(p, "u1", ["guide:5kyu:1"])).toBe(p);
  });
});

describe("withoutSettledSteps", () => {
  it("drops the settled keys of that user only", () => {
    const p = progressWith({
      byUser: {
        u1: { pendingSteps: ["guide:5kyu:1", "guide:5kyu:2"] },
        u2: { pendingSteps: ["guide:5kyu:1"] },
      },
    });
    const next = withoutSettledSteps(p, "u1", ["guide:5kyu:1"]);
    expect(pendingStepsOf(next, "u1")).toEqual(["guide:5kyu:2"]);
    expect(pendingStepsOf(next, "u2")).toEqual(["guide:5kyu:1"]);
  });

  it("removes the user's entry once nothing is pending", () => {
    const p = progressWith({
      byUser: { u1: { pendingSteps: ["guide:5kyu:1"] } },
    });
    expect(withoutSettledSteps(p, "u1", ["guide:5kyu:1"]).byUser).toEqual({});
  });
});

describe("withGuestImported", () => {
  const guest = progressWith({
    guest: { steps: ["guide:5kyu:1"], attempts: ["square_colors:default"] },
  });

  it("moves the guest's pages to the first account and keeps the challenges", () => {
    const next = withGuestImported(guest, "u1");
    expect(pendingStepsOf(next, "u1")).toEqual(["guide:5kyu:1"]);
    expect(next.guest).toEqual({
      steps: [],
      attempts: ["square_colors:default"],
    });
    expect(next.guestImported).toBe(true);
  });

  it("imports the guest's pages only once, so a second account gets none", () => {
    const first = withGuestImported(guest, "u1");
    const later = withGuestStep(first, "guide:4kyu:1");
    const second = withGuestImported(later, "u2");
    expect(second).toBe(later);
    expect(pendingStepsOf(second, "u2")).toEqual([]);
  });

  it("does not duplicate a page the account already holds", () => {
    const p = progressWith({
      guest: { steps: ["guide:5kyu:1"], attempts: [] },
      byUser: { u1: { pendingSteps: ["guide:5kyu:1"] } },
    });
    expect(pendingStepsOf(withGuestImported(p, "u1"), "u1")).toEqual([
      "guide:5kyu:1",
    ]);
  });
});

describe("the stored progress", () => {
  beforeEach(() => {
    resetDeviceProgressForTests();
  });

  it("writes every change through under DOJO_PROGRESS", async () => {
    await markGuestStep("guide:5kyu:1");
    await markPendingStep("u1", "guide:4kyu:1");
    const stored = JSON.parse(
      (await AsyncStorage.getItem(DOJO_PROGRESS_STORAGE_KEY)) ?? "null",
    ) as unknown;
    expect(parseDeviceProgress(stored)).toEqual({
      guest: { steps: ["guide:5kyu:1"], attempts: [] },
      byUser: { u1: { pendingSteps: ["guide:4kyu:1"] } },
      guestImported: false,
    });
  });

  it("applies a change on top of what was stored, not over it", async () => {
    await AsyncStorage.setItem(
      DOJO_PROGRESS_STORAGE_KEY,
      JSON.stringify({ guest: { steps: ["guide:5kyu:1"], attempts: [] } }),
    );
    await markGuestStep("guide:5kyu:2");
    expect((await readDeviceProgress()).guest.steps).toEqual([
      "guide:5kyu:1",
      "guide:5kyu:2",
    ]);
  });

  it("reads a corrupted record as empty", async () => {
    await AsyncStorage.setItem(DOJO_PROGRESS_STORAGE_KEY, "{not json");
    expect(await readDeviceProgress()).toEqual(EMPTY_DEVICE_PROGRESS);
  });
});
