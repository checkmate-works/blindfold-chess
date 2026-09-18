import type { UciMessageChannel } from "@blindfold-chess/features/ai-game/engine";

import type { StockfishWebViewHandle } from "./StockfishWebView";

/**
 * A {@link UciMessageChannel} that also accepts traffic pushed in from the
 * outside.
 *
 * The web channel owns both directions of its pipe: it constructs the Worker,
 * so it can attach `onmessage` itself. The WebView is a rendered React
 * component instead — its replies arrive as `onMessage` / `onError` props on
 * the element, which only the hook that renders it can see. So the inbound
 * half is pushed: the hook forwards what the component hands it through
 * `deliverMessage` / `deliverError`, and the channel fans it out to the
 * transport's registered handlers.
 */
export type WebViewUciMessageChannel = UciMessageChannel & {
  /** Feed one engine reply line (already stripped of the ready/error frames). */
  deliverMessage(message: string): void;
  /** Report a fatal WebView / bridge failure and mark the channel dead. */
  deliverError(error: Error): void;
};

/**
 * Mobile-side `UciMessageChannel` implementation backed by the hidden
 * Stockfish WebView.
 *
 * Outbound commands go through `StockfishWebViewHandle.sendCommand`, which
 * `injectJavaScript`s a call to the page's `window.sendCommand`. This adapter
 * is the only chunk of React-Native-specific code left in the chess-engine
 * layer — the UCI protocol state machine, the per-command deadlines, the init
 * retry loop and the orchestration all live in
 * `@blindfold-chess/features/ai-game/engine`.
 *
 * `getHandle` is a getter, not the handle itself, because the caller holds a
 * React ref: the WebView may not have mounted when the channel is built, and
 * `ChessEngine` builds a fresh channel per init attempt while the ref keeps
 * pointing at the same component.
 *
 * `terminate()` cannot unmount the WebView — the component's lifetime belongs
 * to the screen that renders it, not to the channel. It marks this channel
 * dead so nothing further is sent or delivered through it; a retry then opens
 * a new channel over the same, still-running page and repeats the `uci`
 * handshake, which Stockfish accepts at any point.
 */
export function createWebViewMessageChannel(
  getHandle: () => StockfishWebViewHandle | null,
): WebViewUciMessageChannel {
  const messageHandlers = new Set<(message: string) => void>();
  const errorHandlers = new Set<(error: Error) => void>();
  let live = true;

  return {
    send(command) {
      if (!live) throw new Error("channel already terminated");
      const handle = getHandle();
      if (!handle) throw new Error("Stockfish WebView is not mounted");
      handle.sendCommand(command);
    },
    onMessage(handler) {
      messageHandlers.add(handler);
      return () => {
        messageHandlers.delete(handler);
      };
    },
    onError(handler) {
      errorHandlers.add(handler);
      return () => {
        errorHandlers.delete(handler);
      };
    },
    terminate() {
      live = false;
      messageHandlers.clear();
      errorHandlers.clear();
    },
    deliverMessage(message) {
      if (!live) return;
      // Iterate a snapshot: a handler is free to tear the channel down (and
      // therefore clear this set) while we are still walking it.
      for (const h of [...messageHandlers]) h(message);
    },
    deliverError(error) {
      if (!live) return;
      // Dead before the handlers run, so a `send` attempted from inside one
      // throws rather than injecting JavaScript into a page that just failed.
      live = false;
      // Preserve observability — the WebView's `onError` prop and the page's
      // own `Error:` prints are the only places a bridge failure surfaces.
      console.error("StockfishWebView error:", error);
      for (const h of [...errorHandlers]) h(error);
      messageHandlers.clear();
      errorHandlers.clear();
    },
  };
}
