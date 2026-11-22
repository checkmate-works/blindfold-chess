import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MobileAccount } from "./account";

type Listener = (
  event: string,
  session: { user: { id: string; email: string } } | null,
) => void;

const mocks = vi.hoisted(() => ({
  fetchAccount: vi.fn(),
  listener: undefined as Listener | undefined,
}));

vi.mock("./account", () => ({ fetchAccount: mocks.fetchAccount }));
vi.mock("./supabase-client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (listener: Listener) => {
        mocks.listener = listener;
      },
      signOut: vi.fn(),
    },
  },
}));

function account(userId: string): MobileAccount {
  return { userId, email: null, username: "player", banned: false };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function signIn(id: string) {
  mocks.listener?.("SIGNED_IN", { user: { id, email: `${id}@example.com` } });
}

async function loadModule() {
  vi.resetModules();
  return import("./use-auth");
}

describe("refreshAccount", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.fetchAccount.mockReset();
    mocks.listener = undefined;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shares one /me request between calls made while it is in progress", async () => {
    const { refreshAccount, getAuthState } = await loadModule();
    const response = deferred<MobileAccount>();
    mocks.fetchAccount.mockReturnValue(response.promise);
    signIn("u1");

    const first = refreshAccount();
    const second = refreshAccount();
    vi.runAllTimers(); // the auth listener's own deferred refresh
    expect(mocks.fetchAccount).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);

    response.resolve(account("u1"));
    await expect(first).resolves.toEqual(account("u1"));
    expect(getAuthState().account).toEqual(account("u1"));
  });

  it("sends a new request once the previous one has settled, so a failed load can be retried", async () => {
    const { refreshAccount, getAuthState } = await loadModule();
    mocks.fetchAccount.mockResolvedValueOnce({ error: "serverError" });
    signIn("u1");

    await refreshAccount();
    expect(getAuthState().account).toBeUndefined();
    expect(getAuthState().accountError).toBe(true);

    mocks.fetchAccount.mockResolvedValueOnce(account("u1"));
    await refreshAccount();
    expect(mocks.fetchAccount).toHaveBeenCalledTimes(2);
    expect(getAuthState().account).toEqual(account("u1"));
    expect(getAuthState().accountError).toBe(false);
  });

  it("does not hand a request made for one user to the next user, and drops its answer", async () => {
    const { refreshAccount, getAuthState } = await loadModule();
    const forFirst = deferred<MobileAccount>();
    mocks.fetchAccount.mockReturnValueOnce(forFirst.promise);
    signIn("u1");
    const first = refreshAccount();

    mocks.fetchAccount.mockResolvedValueOnce(account("u2"));
    signIn("u2");
    const second = refreshAccount();
    expect(second).not.toBe(first);

    await second;
    forFirst.resolve(account("u1"));
    await expect(first).resolves.toBeUndefined();
    expect(getAuthState().account).toEqual(account("u2"));
  });

  it("does nothing while signed out", async () => {
    const { refreshAccount } = await loadModule();
    mocks.listener?.("SIGNED_OUT", null);
    await expect(refreshAccount()).resolves.toBeUndefined();
    expect(mocks.fetchAccount).not.toHaveBeenCalled();
  });
});
