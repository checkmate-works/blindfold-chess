import { Screen } from "./Screen";
import type { ReactNode } from "react";
import { StyleSheet, ScrollView } from "react-native";
import type { Href } from "expo-router";

import { BottomBar } from "./BottomBar";
import { Button } from "./Button";
import { ModeButtonRow } from "./ModeButtonRow";
import { useCloseSession } from "../navigation/use-close-session";
import { spacing } from "../theme";

type PracticeResultScreenProps = {
  playAgainLabel: string;
  backToMenuLabel: string;
  /**
   * The feature's setup screen. "Play again" closes the session modal, which
   * normally reveals this screen underneath; the href is the fallback when
   * the modal was opened without it (deep link, restored process).
   */
  setupHref: Href;
  /**
   * How the two actions are laid out. `"stacked"`: a large "play again"
   * over a ghost "back to menu". `"row"`: the setup footer's
   * `ModeButtonRow`, back to menu on the left (outlined) and play again on
   * the right (filled), so the footer keeps the shape it had before the
   * run. Square colors uses `"row"`; the other modules move to it once its
   * look is settled, and `"stacked"` goes then.
   */
  actions?: "stacked" | "row";
  /** The result card rendered under the title. */
  children: ReactNode;
};

/**
 * Shared layout for every practice result screen: the result card, with
 * "play again" / "back to menu" actions pinned to the bottom. The title is
 * the header's (registered in `moduleSessionScreens`).
 */
export function PracticeResultScreen({
  playAgainLabel,
  backToMenuLabel,
  setupHref,
  actions = "stacked",
  children,
}: PracticeResultScreenProps) {
  const { close, closeToMenu } = useCloseSession(setupHref);

  return (
    <Screen edges={[]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {children}
      </ScrollView>

      {actions === "row" ? (
        <BottomBar>
          <ModeButtonRow
            secondary={{
              title: backToMenuLabel,
              icon: "list",
              onPress: closeToMenu,
              testID: "result-back-to-menu",
            }}
            primary={{
              title: playAgainLabel,
              icon: "refresh",
              onPress: close,
              testID: "result-play-again",
            }}
          />
        </BottomBar>
      ) : (
        <BottomBar style={styles.footer}>
          <Button title={playAgainLabel} onPress={close} size="lg" fullWidth />
          <Button
            title={backToMenuLabel}
            onPress={closeToMenu}
            variant="ghost"
            size="md"
            fullWidth
          />
        </BottomBar>
      )}
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
  footer: {
    gap: spacing.sm,
  },
});
