import { afterEach, describe, expect, it, vi } from "vitest";

import { PendingRequests } from "./pending-requests";

afterEach(() => {
  vi.useRealTimers();
});

const options = (dispatch: () => void = () => {}) => ({
  timeoutMs: 1000,
  timeoutMessage: "timed out",
  dispatch,
});

describe("PendingRequests", () => {
  it("resolves the request registered under the matching key", async () => {
    const requests = new PendingRequests<number>();
    const promise = requests.request("a", options());

    expect(requests.settle("a", 42)).toBe(true);

    await expect(promise).resolves.toBe(42);
    expect(requests.size).toBe(0);
  });

  it("routes concurrent requests by key", async () => {
    const requests = new PendingRequests<string>();
    const first = requests.request(1, options());
    const second = requests.request(2, options());

    requests.settle(2, "second");
    requests.settle(1, "first");

    await expect(first).resolves.toBe("first");
    await expect(second).resolves.toBe("second");
  });

  it("rejects with the timeout message when no response arrives", async () => {
    vi.useFakeTimers();
    const requests = new PendingRequests<void>();
    const promise = requests.request("a", {
      timeoutMs: 500,
      timeoutMessage: "engine never answered",
      dispatch: () => {},
    });

    // Attach the rejection handler before advancing the clock: the deadline
    // fires synchronously inside `advanceTimersByTimeAsync`, and an unhandled
    // rejection in that window fails the run even though the assertion below
    // would have passed.
    const settled = expect(promise).rejects.toThrow(/engine never answered/);
    await vi.advanceTimersByTimeAsync(500);
    await settled;

    expect(requests.size).toBe(0);
  });

  it("does not fire the deadline after the request settles", async () => {
    vi.useFakeTimers();
    const requests = new PendingRequests<number>();
    const promise = requests.request("a", options());
    requests.settle("a", 1);
    await expect(promise).resolves.toBe(1);

    // A timer left armed would reject an already-resolved promise (harmless)
    // but also keep the clock busy; assert it was cleared instead.
    expect(vi.getTimerCount()).toBe(0);
  });

  it("dispatches only after the resolver is registered", async () => {
    const requests = new PendingRequests<string>();
    // A pipe that answers synchronously inside `dispatch` must still find its
    // slot — this is the ordering guarantee that makes a fake worker usable.
    const promise = requests.request("a", {
      ...options(),
      dispatch: () => {
        requests.settle("a", "sync");
      },
    });

    await expect(promise).resolves.toBe("sync");
  });

  it("releases the slot and rejects when dispatch throws", async () => {
    vi.useFakeTimers();
    const requests = new PendingRequests<void>();
    const promise = requests.request("a", {
      ...options(() => {
        throw new Error("channel already terminated");
      }),
    });

    await expect(promise).rejects.toThrow(/channel already terminated/);
    expect(requests.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects a duplicate key without displacing the in-flight request", async () => {
    const requests = new PendingRequests<number>();
    const first = requests.request("a", options());
    const duplicate = requests.request("a", options());

    await expect(duplicate).rejects.toThrow(/already in flight/);

    requests.settle("a", 7);
    await expect(first).resolves.toBe(7);
  });

  it("failAll rejects every outstanding request with the given reason", async () => {
    const requests = new PendingRequests<number>();
    const first = requests.request(1, options());
    const second = requests.request(2, options());

    requests.failAll(new Error("worker crashed"));

    await expect(first).rejects.toThrow(/worker crashed/);
    await expect(second).rejects.toThrow(/worker crashed/);
    expect(requests.size).toBe(0);
  });

  it("abandonAll drops requests without settling them and cancels their timers", async () => {
    vi.useFakeTimers();
    const requests = new PendingRequests<number>();
    const promise = requests.request("a", options());
    const outcome = Promise.race([
      promise.then(() => "settled").catch(() => "settled"),
      new Promise<string>((resolve) => setTimeout(() => resolve("pending"), 1)),
    ]);

    requests.abandonAll();
    expect(requests.size).toBe(0);

    await vi.advanceTimersByTimeAsync(5000);
    await expect(outcome).resolves.toBe("pending");
  });

  it("reports a late response for an unknown key instead of throwing", () => {
    const requests = new PendingRequests<number>();
    expect(requests.settle("gone", 1)).toBe(false);
    expect(requests.fail("gone", new Error("boom"))).toBe(false);
  });
});
