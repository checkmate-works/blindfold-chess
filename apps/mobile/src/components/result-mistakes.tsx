import { createContext, useContext } from "react";
import type { ViewInstance } from "react-native";

/**
 * Hand-off between the score's "Incorrect" count and the result screen's
 * problem list, so the count can open the missed problems — the web's
 * `mistake-reveal`. The count sits in the shared result card and the list is
 * a module's child of the screen, so neither owns the other; the screen
 * (`PracticeResultScreen`) holds the one handler between them.
 *
 * A list registers how to open its missed rows (only when it has some); the
 * count reads `reveal` and stays plain text while it is `undefined`, so the
 * screen never shows a link that does nothing.
 */
export type ResultMistakes = {
  /** Opens the missed problems and scrolls to them; `undefined` when none. */
  reveal: (() => void) | undefined;
  /** Registers the list's handler. Returns the unregister. */
  register: (handler: () => void) => () => void;
  /** Scrolls the result so `view` sits at the top of the screen. */
  scrollTo: (view: ViewInstance | null) => void;
};

export const ResultMistakesContext = createContext<ResultMistakes | undefined>(
  undefined,
);

/** The screen's hand-off, or `undefined` outside a result screen. */
export function useResultMistakes(): ResultMistakes | undefined {
  return useContext(ResultMistakesContext);
}
