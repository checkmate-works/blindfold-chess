import { Screen } from "./Screen";
import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { StyleSheet, ScrollView, View } from "react-native";
import type { ScrollViewInstance, ViewInstance } from "react-native";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";

import { BottomBar } from "./BottomBar";
import { Button } from "./Button";
import { ModeButtonRow } from "./ModeButtonRow";
import { ResultMistakesContext, type ResultMistakes } from "./result-mistakes";
import { useCloseSession } from "../navigation/use-close-session";
import { spacing } from "../theme";

type PracticeResultScreenProps = {
  /**
   * The feature's setup screen. "Play again" closes the session modal, which
   * normally reveals this screen underneath; the href is the fallback when
   * the modal was opened without it (deep link, restored process).
   */
  setupHref: Href;
  /** The result card rendered under the title. */
  children: ReactNode;
  /**
   * Leave out "Back to menu", keeping only "Play again". An exam run sets
   * it: the run was started from the exam's problem page, which "Play
   * again" returns to, and "Back to menu" would pop the exam's screens out
   * from under the player (the puzzle exam's result has only Try Again for
   * the same reason).
   */
  hideBackToMenu?: boolean;
};

/**
 * Shared layout for every practice result screen: the result card, with the
 * two ways out pinned to the bottom in the setup footer's `ModeButtonRow` —
 * "Back to menu" on the left (outlined) and "Play again" on the right
 * (filled), so the footer keeps the shape it had before the run. The title
 * is the header's (registered in `moduleSessionScreens`).
 *
 * The labels and where each button goes are owned here, not by the
 * modules, so every result screen reads and behaves the same and a change
 * to either is made once.
 *
 * The screen also holds the hand-off between the score's "Incorrect" count
 * and a problem list (`ResultMistakesContext`), since it owns the scroll
 * both sit in.
 */
export function PracticeResultScreen({
  setupHref,
  children,
  hideBackToMenu = false,
}: PracticeResultScreenProps) {
  const { t } = useTranslation();
  const { close, closeToMenu } = useCloseSession(setupHref);
  const mistakes = useResultMistakesHandOff();

  return (
    <Screen edges={[]}>
      <ScrollView
        ref={mistakes.scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <ResultMistakesContext.Provider value={mistakes.value}>
          <View ref={mistakes.contentRef} collapsable={false}>
            {children}
          </View>
        </ResultMistakesContext.Provider>
      </ScrollView>

      <BottomBar>
        {hideBackToMenu ? (
          <Button
            title={t("practiceResult.playAgain")}
            icon="refresh"
            size="lg"
            fullWidth
            onPress={close}
            testID="result-play-again"
          />
        ) : (
          <ModeButtonRow
            secondary={{
              title: t("practiceResult.backToMenu"),
              icon: "list",
              onPress: closeToMenu,
              testID: "result-back-to-menu",
            }}
            primary={{
              title: t("practiceResult.playAgain"),
              icon: "refresh",
              onPress: close,
              testID: "result-play-again",
            }}
          />
        )}
      </BottomBar>
    </Screen>
  );
}

/** The gap left above a view scrolled to the top: the content's padding. */
const SCROLL_TO_MARGIN = spacing.lg;

/**
 * One registered "open the missed problems" handler, and a scroll that puts
 * a view inside the result at the top of the screen.
 */
function useResultMistakesHandOff() {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const contentRef = useRef<ViewInstance>(null);
  const [handler, setHandler] = useState<(() => void) | undefined>(undefined);

  const register = useCallback((next: () => void) => {
    setHandler(() => next);
    return () =>
      setHandler((current) => (current === next ? undefined : current));
  }, []);

  const scrollTo = useCallback((view: ViewInstance | null) => {
    const content = contentRef.current;
    if (!view || !content) return;
    view.measureLayout(content, (_x, y) => {
      // `y` is from the top of the content wrapper, which sits under the
      // scroll content's padding.
      scrollRef.current?.scrollTo({
        y: Math.max(y + spacing.lg - SCROLL_TO_MARGIN, 0),
        animated: true,
      });
    });
  }, []);

  const value = useMemo<ResultMistakes>(
    () => ({ reveal: handler, register, scrollTo }),
    [handler, register, scrollTo],
  );
  return { scrollRef, contentRef, value };
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: "center",
  },
});
