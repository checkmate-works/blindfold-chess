/**
 * The dojo progress this device holds, by owner: what a signed-out player has
 * done, and what a signed-in player has done that the server has not taken
 * yet.
 *
 * @description
 * Stored under AsyncStorage `"DOJO_PROGRESS"` as
 * `{ guest: { steps, attempts }, byUser: { [userId]: { pendingSteps } }, guestImported }`.
 *
 * - `guest.steps` — guide pages (`guide:<rank>:<page>`) read while signed out.
 * - `guest.attempts` — challenges (`<menuType>:<leaderboardKey>`) finished
 *   while signed out. They count as "practised" on this device for whoever
 *   uses it and are never sent: the server already knows a signed-in
 *   player's practice from their best scores.
 * - `byUser[userId].pendingSteps` — guide pages a signed-in player read that
 *   the server has not confirmed yet. A page is put here before it is sent,
 *   so reading offline loses nothing; the sync sends it later and drops it
 *   once the server answers for it.
 * - `guestImported` — whether the guest's guide pages have been handed to an
 *   account. They go once, to the first account that signs in on this
 *   device, and the flag keeps a second account from getting them too.
 *
 * Keeping owners apart is the point: if pages were one shared list, a second
 * person signing in on a shared device would find the first person's pages
 * marked as theirs.
 *
 * Nothing here raises a rank. Ranks come from the server only; this store
 * holds "worked on it" marks, which the server accepts as reported.
 *
 * Read once at start-up and held in memory; every change is written through.
 * A stored value that cannot be read, or parts of it that have the wrong
 * shape, read as empty, so a corrupted record costs marks but never crashes
 * the dojo.
 */
import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const DOJO_PROGRESS_STORAGE_KEY = "DOJO_PROGRESS";

export type DeviceProgress = {
  readonly guest: {
    readonly steps: readonly string[];
    readonly attempts: readonly string[];
  };
  readonly byUser: Readonly<
    Record<string, { readonly pendingSteps: readonly string[] }>
  >;
  readonly guestImported: boolean;
};

export const EMPTY_DEVICE_PROGRESS: DeviceProgress = {
  guest: { steps: [], attempts: [] },
  byUser: {},
  guestImported: false,
};

// ---------------------------------------------------------------------------
// Pure updates. Each returns the same object when nothing changes, so the
// store can skip the write and the re-render.
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringsOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is string => typeof v === "string"))];
}

/** A stored value read back; anything unreadable reads as empty. */
export function parseDeviceProgress(raw: unknown): DeviceProgress {
  if (!isRecord(raw)) return EMPTY_DEVICE_PROGRESS;
  const guest = isRecord(raw.guest) ? raw.guest : {};
  const byUser: Record<string, { pendingSteps: string[] }> = {};
  if (isRecord(raw.byUser)) {
    for (const [userId, entry] of Object.entries(raw.byUser)) {
      const pendingSteps = isRecord(entry) ? stringsOf(entry.pendingSteps) : [];
      if (pendingSteps.length > 0) byUser[userId] = { pendingSteps };
    }
  }
  return {
    guest: {
      steps: stringsOf(guest.steps),
      attempts: stringsOf(guest.attempts),
    },
    byUser,
    guestImported: raw.guestImported === true,
  };
}

export function pendingStepsOf(
  progress: DeviceProgress,
  userId: string,
): readonly string[] {
  return Object.hasOwn(progress.byUser, userId)
    ? (progress.byUser[userId]?.pendingSteps ?? [])
    : [];
}

function withPending(
  progress: DeviceProgress,
  userId: string,
  pendingSteps: readonly string[],
): DeviceProgress {
  const byUser = { ...progress.byUser };
  if (pendingSteps.length === 0) delete byUser[userId];
  else byUser[userId] = { pendingSteps };
  return { ...progress, byUser };
}

/** Marks a guide page read by the signed-out player. */
export function withGuestStep(
  progress: DeviceProgress,
  key: string,
): DeviceProgress {
  if (progress.guest.steps.includes(key)) return progress;
  return {
    ...progress,
    guest: { ...progress.guest, steps: [...progress.guest.steps, key] },
  };
}

/** Marks a challenge finished by the signed-out player. */
export function withGuestAttempt(
  progress: DeviceProgress,
  key: string,
): DeviceProgress {
  if (progress.guest.attempts.includes(key)) return progress;
  return {
    ...progress,
    guest: { ...progress.guest, attempts: [...progress.guest.attempts, key] },
  };
}

/** Holds a guide page `userId` read until the server confirms it. */
export function withPendingStep(
  progress: DeviceProgress,
  userId: string,
  key: string,
): DeviceProgress {
  const pending = pendingStepsOf(progress, userId);
  if (pending.includes(key)) return progress;
  return withPending(progress, userId, [...pending, key]);
}

/**
 * Drops the keys the server has answered for — recorded or refused — from
 * `userId`'s pending steps. A refused key would be refused again on every
 * sync, so keeping it would only resend it forever. Other users' pending
 * steps are untouched.
 */
export function withoutSettledSteps(
  progress: DeviceProgress,
  userId: string,
  settled: Iterable<string>,
): DeviceProgress {
  const drop = new Set(settled);
  const pending = pendingStepsOf(progress, userId);
  const kept = pending.filter((key) => !drop.has(key));
  if (kept.length === pending.length) return progress;
  return withPending(progress, userId, kept);
}

/**
 * Moves the guest's guide pages into `userId`'s pending steps, once per
 * device: after the first import `guestImported` stays true, so the account
 * signing in next gets nothing from the guest. The guest's challenge marks
 * are not moved — they stay on the device and are never sent.
 */
export function withGuestImported(
  progress: DeviceProgress,
  userId: string,
): DeviceProgress {
  if (progress.guestImported) return progress;
  const pending = pendingStepsOf(progress, userId);
  const merged = [
    ...pending,
    ...progress.guest.steps.filter((key) => !pending.includes(key)),
  ];
  return {
    ...withPending(progress, userId, merged),
    guest: { ...progress.guest, steps: [] },
    guestImported: true,
  };
}

// ---------------------------------------------------------------------------
// The store.
// ---------------------------------------------------------------------------

let progress: DeviceProgress = EMPTY_DEVICE_PROGRESS;
let loading: Promise<void> | undefined;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/**
 * Reads the stored value once. Every caller waits on the same read, so an
 * update made while it is in flight is applied on top of what was stored
 * rather than overwriting it.
 */
function ensureLoaded(): Promise<void> {
  loading ??= (async () => {
    try {
      const raw = await AsyncStorage.getItem(DOJO_PROGRESS_STORAGE_KEY);
      progress = parseDeviceProgress(raw ? JSON.parse(raw) : undefined);
    } catch {
      progress = EMPTY_DEVICE_PROGRESS;
    }
    emit();
  })();
  return loading;
}

/** Applies `update` to the loaded value and writes it through. */
export async function updateDeviceProgress(
  update: (current: DeviceProgress) => DeviceProgress,
): Promise<DeviceProgress> {
  await ensureLoaded();
  const next = update(progress);
  if (next === progress) return progress;
  progress = next;
  emit();
  try {
    await AsyncStorage.setItem(
      DOJO_PROGRESS_STORAGE_KEY,
      JSON.stringify(progress),
    );
  } catch {
    // The marks stay in memory for this run; the next change writes again.
  }
  return progress;
}

/** The loaded value, after the stored one has been read. */
export async function readDeviceProgress(): Promise<DeviceProgress> {
  await ensureLoaded();
  return progress;
}

export function markGuestStep(key: string): Promise<DeviceProgress> {
  return updateDeviceProgress((p) => withGuestStep(p, key));
}

export function markGuestAttempt(key: string): Promise<DeviceProgress> {
  return updateDeviceProgress((p) => withGuestAttempt(p, key));
}

export function markPendingStep(
  userId: string,
  key: string,
): Promise<DeviceProgress> {
  return updateDeviceProgress((p) => withPendingStep(p, userId, key));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void ensureLoaded();
  return () => {
    listeners.delete(listener);
  };
}

export function useDeviceProgress(): DeviceProgress {
  return useSyncExternalStore(subscribe, () => progress);
}

/** Forgets the loaded value so the next read starts from storage. Tests only. */
export function resetDeviceProgressForTests(): void {
  progress = EMPTY_DEVICE_PROGRESS;
  loading = undefined;
  listeners.clear();
}
