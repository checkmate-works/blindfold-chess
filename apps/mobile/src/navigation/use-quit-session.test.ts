import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getScreenNotice, takeScreenNotice } from "./screen-notice";
import { useQuitSession } from "./use-quit-session";

type AlertButton = { text: string; style?: string; onPress?: () => void };

const { alert, close } = vi.hoisted(() => ({
  alert:
    vi.fn<(title: string, message: string, buttons: AlertButton[]) => void>(),
  close: vi.fn(),
}));

vi.mock("react-native", () => ({ Alert: { alert } }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("./use-close-session", () => ({
  useCloseSession: () => ({ close, closeToMenu: vi.fn() }),
}));

afterEach(() => {
  takeScreenNotice();
  alert.mockReset();
  close.mockReset();
});

/** Presses the confirmation's destructive button. */
function confirmQuit() {
  const buttons = alert.mock.calls[0]?.[2] ?? [];
  buttons.find((b) => b.style === "destructive")?.onPress?.();
}

describe("useQuitSession", () => {
  it("closes and says 'Session quit' once the quit is confirmed", () => {
    const { result } = renderHook(() => useQuitSession({ confirm: true }));

    result.current();
    expect(close).not.toHaveBeenCalled();
    expect(getScreenNotice()).toBeNull();

    confirmQuit();
    expect(close).toHaveBeenCalledOnce();
    expect(getScreenNotice()?.kind).toBe("sessionQuit");
  });

  it("says nothing when the confirmation is cancelled", () => {
    const { result } = renderHook(() => useQuitSession({ confirm: true }));

    result.current();
    const cancel = alert.mock.calls[0]?.[2].find((b) => b.style === "cancel");
    cancel?.onPress?.();

    expect(close).not.toHaveBeenCalled();
    expect(getScreenNotice()).toBeNull();
  });

  it("says nothing for a close that loses nothing", () => {
    const { result } = renderHook(() => useQuitSession());

    result.current();

    expect(alert).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
    expect(getScreenNotice()).toBeNull();
  });

  it("leaves a session's own onClose to say what it does", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useQuitSession({ confirm: true, onClose }),
    );

    result.current();
    confirmQuit();

    expect(onClose).toHaveBeenCalledOnce();
    expect(close).not.toHaveBeenCalled();
    expect(getScreenNotice()).toBeNull();
  });
});
