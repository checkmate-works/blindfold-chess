/**
 * Unit tests for the mobile `UciMessageChannel` adapter.
 *
 * The UCI conversation itself is covered by `chess-engine.test.ts` /
 * `uci-transport.test.ts` in `@blindfold-chess/features`; those now describe
 * mobile too, because mobile drives the same `ChessEngine`. What is left here
 * is the part only this file owns: the contract `UciTransport` relies on —
 * commands reach the WebView handle, replies fan out to every registered
 * handler, a fatal error is announced exactly once and closes the channel for
 * good, and `terminate()` is idempotent.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StockfishWebViewHandle } from "./StockfishWebView";
import { createWebViewMessageChannel } from "./webview-message-channel";

function createHandle() {
  return { sendCommand: vi.fn() } satisfies StockfishWebViewHandle;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createWebViewMessageChannel", () => {
  it("forwards commands to the handle the getter returns at call time", () => {
    let handle: StockfishWebViewHandle | null = null;
    const channel = createWebViewMessageChannel(() => handle);

    // The engine may build its channel before the WebView has mounted.
    expect(() => channel.send("uci")).toThrow(/not mounted/);

    handle = createHandle();
    channel.send("uci");
    expect(handle.sendCommand).toHaveBeenCalledWith("uci");
  });

  it("delivers each reply to every registered message handler", () => {
    const channel = createWebViewMessageChannel(createHandle);
    const first = vi.fn();
    const second = vi.fn();
    channel.onMessage(first);
    channel.onMessage(second);

    channel.deliverMessage("uciok");

    expect(first).toHaveBeenCalledWith("uciok");
    expect(second).toHaveBeenCalledWith("uciok");
  });

  it("stops delivering to an unsubscribed handler", () => {
    const channel = createWebViewMessageChannel(createHandle);
    const handler = vi.fn();
    const unsubscribe = channel.onMessage(handler);

    unsubscribe();
    channel.deliverMessage("readyok");

    expect(handler).not.toHaveBeenCalled();
  });

  it("announces a fatal error to every error handler and refuses further sends", () => {
    const handle = createHandle();
    const channel = createWebViewMessageChannel(() => handle);
    const onError = vi.fn();
    channel.onError(onError);

    const failure = new Error("WebView error: net::ERR_FAILED");
    channel.deliverError(failure);

    expect(onError).toHaveBeenCalledWith(failure);
    expect(() => channel.send("isready")).toThrow(/terminated/);
    expect(handle.sendCommand).not.toHaveBeenCalled();
  });

  it("survives an error handler that tears the channel down mid-dispatch", () => {
    const channel = createWebViewMessageChannel(createHandle);
    // This is what `UciTransport.handleFatalError` does: it terminates the
    // channel from inside the callback, clearing the set being iterated.
    const first = vi.fn(() => channel.terminate());
    const second = vi.fn();
    channel.onError(first);
    channel.onError(second);

    channel.deliverError(new Error("boom"));

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it("reports a fatal error only once", () => {
    const channel = createWebViewMessageChannel(createHandle);
    const onError = vi.fn();
    channel.onError(onError);

    channel.deliverError(new Error("first"));
    channel.deliverError(new Error("second"));

    expect(onError).toHaveBeenCalledOnce();
  });

  it("drops replies that arrive after termination", () => {
    const channel = createWebViewMessageChannel(createHandle);
    const handler = vi.fn();
    channel.onMessage(handler);

    channel.terminate();
    channel.terminate();
    channel.deliverMessage("bestmove e2e4");

    expect(handler).not.toHaveBeenCalled();
  });
});
