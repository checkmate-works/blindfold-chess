/**
 * Brings a signed-in player's dojo progress and the server's record together.
 *
 * @description
 * A guide page is a "worked on it" mark, so the app reports it
 * (`guide:<rank>:<page>`) and the server takes the report once the key has
 * the right shape. An exam pass is different: it is evidence for a rank, so
 * the app never reports one. It sends the answer (`exam-run.ts`) and the
 * server grades it and writes `exam:<rank>:<problem>` itself — if the server
 * took `exam:` keys from the app, calling the API directly would be enough
 * to earn a rank. That is why only guide pages ever sit in the device's
 * pending steps, and why the server refuses (`rejected`) any `exam:` key it
 * is sent.
 *
 * What the server answered is kept in memory only, together with the user it
 * was read for, so one account's record never shows under another after a
 * switch. The device's own marks live in `progress-store.ts`.
 */
import { useSyncExternalStore } from "react";
import { DOJO_STEPS_MAX } from "@blindfold-chess/features/dojo-journey";

import {
  fetchDojoProgress,
  postGuideSteps,
  type DojoProgress,
} from "./dojo-api";
import {
  pendingStepsOf,
  readDeviceProgress,
  updateDeviceProgress,
  withGuestImported,
  withoutSettledSteps,
} from "./progress-store";

/** The server's record for one user, as last read. */
export type ServerDojoProgress = DojoProgress & { readonly userId: string };

let server: ServerDojoProgress | undefined;
const listeners = new Set<() => void>();

function setServer(next: ServerDojoProgress | undefined) {
  server = next;
  for (const listener of listeners) listener();
}

export type SyncResult = "synced" | "failed";

/** The sync running for each user, so a second call joins it. */
const running = new Map<string, Promise<SyncResult>>();
/** Users asked to sync again while one was running. */
const again = new Set<string>();

/**
 * Syncs `userId`'s dojo progress, in this order:
 *
 * 1. The guest's guide pages move into `userId`'s pending steps — only if no
 *    account on this device has taken them yet (`guestImported`).
 * 2. The pending steps go to `POST /dojo/steps`, `DOJO_STEPS_MAX` at a time.
 * 3. Every key the server answered for, `completed` or `rejected`, leaves the
 *    pending steps. A rejected key would be rejected again on every sync.
 * 4. `GET /dojo` reads the server's record.
 *
 * A request that fails (offline, server down, a malformed answer) ends the
 * sync with the pending steps that were not answered still held, so the next
 * sync sends them again.
 *
 * A call for a user whose sync is already running joins it instead of
 * starting a second one (two at once would send the same keys twice), and
 * one more sync runs after it, so a page marked during the first is sent
 * without waiting for the next focus.
 */
export function syncDojoProgress(userId: string): Promise<SyncResult> {
  const current = running.get(userId);
  if (current) {
    again.add(userId);
    return current;
  }
  const run = runSync(userId).finally(() => {
    running.delete(userId);
    if (again.delete(userId)) void syncDojoProgress(userId);
  });
  running.set(userId, run);
  return run;
}

async function runSync(userId: string): Promise<SyncResult> {
  await updateDeviceProgress((p) => withGuestImported(p, userId));

  const pending = pendingStepsOf(await readDeviceProgress(), userId);
  for (let start = 0; start < pending.length; start += DOJO_STEPS_MAX) {
    const chunk = pending.slice(start, start + DOJO_STEPS_MAX);
    const result = await postGuideSteps(chunk);
    if ("error" in result) return "failed";
    // Until the read below lands, the confirmed pages stay visible through
    // the last record, so they do not blink off as they leave the device.
    if (server?.userId === userId && result.completed.length > 0) {
      setServer({
        ...server,
        completedSteps: [
          ...new Set([...server.completedSteps, ...result.completed]),
        ],
      });
    }
    await updateDeviceProgress((p) =>
      withoutSettledSteps(p, userId, [...result.completed, ...result.rejected]),
    );
  }

  const record = await fetchDojoProgress();
  if ("error" in record) return "failed";
  setServer({ ...record, userId });
  return "synced";
}

/** The last record read from the server, for whichever user it was read for. */
export function getServerDojoProgress(): ServerDojoProgress | undefined {
  return server;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useServerDojoProgress(): ServerDojoProgress | undefined {
  return useSyncExternalStore(subscribe, () => server);
}

/** Forgets the record and any running sync. Tests only. */
export function resetServerDojoProgressForTests(): void {
  setServer(undefined);
  running.clear();
  again.clear();
}
