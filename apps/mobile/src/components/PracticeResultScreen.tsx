import { Screen } from "./Screen";
import type { ReactNode } from "react";
import { StyleSheet, ScrollView } from "react-native";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";

import { BottomBar } from "./BottomBar";
import { ModeButtonRow } from "./ModeButtonRow";
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
 */
export function PracticeResultScreen({
  setupHref,
  children,
}: PracticeResultScreenProps) {
  const { t } = useTranslation();
  const { close, closeToMenu } = useCloseSession(setupHref);

  return (
    <Screen edges={[]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {children}
      </ScrollView>

      <BottomBar>
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
      </BottomBar>
    </Screen>
  );
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
