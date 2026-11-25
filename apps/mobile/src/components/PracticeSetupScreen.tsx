import { Screen } from "./Screen";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useNavigation, usePathname } from "expo-router";
import { useTranslation } from "react-i18next";

import { Button } from "./Button";
import { HelpSheet } from "../features/help/HelpSheet";
import { helpPagesFor } from "../features/help/help-pages";
import { HeaderIconButton } from "../navigation/HeaderIconButton";
import {
  MOBILE_PRACTICE_MODULES,
  practiceModuleRoute,
} from "../navigation/practice-modules";
import { useTheme, spacing, fontSize } from "../theme";

type PracticeSetupScreenProps = {
  /** From the feature's settings hook; false renders the loading gate. */
  isLoaded: boolean;
  /**
   * The single start button's label. Practice modules leave it out and get
   * the shared "Start", so every module reads the same; only a screen that
   * starts something other than a practice run (the AI game) names it.
   * Ignored when `onStartTraining` is given: the two mode buttons are
   * labelled "Challenge" / "Training".
   */
  startLabel?: string;
  /** Navigates to the feature's (timed) session screen with its own params. */
  onStart: () => void;
  /** Disables the start buttons while the form holds input that cannot start. */
  startDisabled?: boolean;
  /**
   * Opens the module's untimed training screen. When given, the footer shows
   * the two modes side by side instead of the single start button; modules
   * without a training mode omit it.
   */
  onStartTraining?: () => void;
  /** The feature's settings form. */
  children: ReactNode;
};

/**
 * The practice module whose setup screen is at `pathname`
 * (`/practice/<route>`), or undefined off the practice routes.
 */
function moduleForPath(pathname: string) {
  const route = pathname.split("/")[2];
  return MOBILE_PRACTICE_MODULES.find((m) => practiceModuleRoute(m) === route);
}

/**
 * How long a start tap holds the start buttons locked when the screen keeps
 * its focus. Long enough to outlast expo-router's queued push (it is
 * dispatched on the next render, well under a frame or two), short enough
 * that a retry after a validation error does not feel ignored.
 */
const START_RELEASE_MS = 1000;

/**
 * Wraps the start handlers so that, while the setup screen has focus, only
 * the first tap goes through.
 *
 * @description
 * `router.push` does not navigate synchronously: expo-router queues the
 * action and dispatches it on the next render, and the session modal then
 * animates in. A second tap in that window would push a second session on
 * top of the first. The lock is released when the screen regains focus
 * (the user came back from the session), so the next start works.
 *
 * Some handlers validate first and return without navigating (recall's
 * PGN check shows an error instead). The screen then never blurs, so the
 * focus release would never come; a timer releases the lock as long as the
 * screen still has focus, which a real push would have taken away by then.
 */
function useStartOnce() {
  const navigation = useNavigation();
  const lockedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      lockedRef.current = false;
      clearTimer();
    }, [clearTimer]),
  );

  useEffect(() => clearTimer, [clearTimer]);

  return useCallback(
    (handler: () => void) => () => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (navigation.isFocused()) lockedRef.current = false;
      }, START_RELEASE_MS);
      handler();
    },
    [navigation, clearTimer],
  );
}

/**
 * Shared layout for every practice setup screen: a loading gate while the
 * persisted settings hydrate, the scrollable settings form, and the start
 * buttons pinned to a bordered footer, so a run can start however far the
 * form is scrolled.
 *
 * A module with a training mode shows its two modes as one row of
 * equal-width buttons under a one-line hint with the challenge rules:
 * Training on the left (outlined), Challenge on the right (filled — the
 * primary action, nearest the thumb). Widths stay equal and only the fill
 * tells the primary apart: a narrower button would squeeze its label. Every
 * such module uses the same two labels, named after the modes the practice
 * tab and the help sheet use, rather than per-module wording ("Start Quiz",
 * "Start Practice", "Start"). Training's own explanation (untimed, ends on
 * End) lives in the help sheet, not in a second footer line.
 *
 * Rejected: the challenge button full width with the training button and
 * its description stacked under it. The footer grew three rows tall, and
 * the stack read as one action plus an afterthought rather than two modes.
 *
 * A module without a training mode has one full-width "Start" button.
 *
 * The buttons are the medium size with 14pt top and bottom padding (about
 * 50pt tall with a 16pt label), the same as the mahjong-scoring app's start
 * footer this layout follows; the large size (about 70pt) made the footer
 * the heaviest thing on the screen.
 *
 * The header's trailing "?" opens the module's `HelpSheet` (how to play,
 * the tutorial's explanations). The module is found from the route, so a
 * setup screen needs nothing extra for it. A module whose help would only
 * repeat the screen — its how-to-play shown on it and no tutorial — gets
 * no "?" at all.
 */
export function PracticeSetupScreen({
  isLoaded,
  startLabel,
  onStart,
  startDisabled = false,
  onStartTraining,
  children,
}: PracticeSetupScreenProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const module = moduleForPath(usePathname());
  const moduleKey = module?.i18nKey ?? null;
  const helpPages = module
    ? helpPagesFor(module.i18nKey, module.howToPlayOnSetup ?? false)
    : [];
  const hasHelp = helpPages.length > 0;
  const [helpOpen, setHelpOpen] = useState(false);
  const startOnce = useStartOnce();

  useLayoutEffect(() => {
    if (!hasHelp) return;
    navigation.setOptions({
      headerRight: () => (
        <HeaderIconButton
          icon="help-circle-outline"
          accessibilityLabel={t("common.help")}
          onPress={() => setHelpOpen(true)}
          testID="header-help"
        />
      ),
    });
  }, [navigation, hasHelp, t]);

  if (!isLoaded) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Screen edges={["bottom"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      >
        {onStartTraining ? (
          <>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              {t("challenge.rules")}
            </Text>
            <View style={styles.modeButtons}>
              <Button
                title={t("common.training")}
                icon="infinite"
                onPress={startOnce(onStartTraining)}
                disabled={startDisabled}
                variant="outline"
                size="md"
                style={[styles.footerButton, styles.half]}
                testID="start-training"
              />
              <Button
                title={t("common.challenge")}
                icon="play"
                onPress={startOnce(onStart)}
                disabled={startDisabled}
                size="md"
                style={[styles.footerButton, styles.half]}
                testID="start-challenge"
              />
            </View>
          </>
        ) : (
          <Button
            title={startLabel ?? t("common.start")}
            icon="play"
            onPress={startOnce(onStart)}
            disabled={startDisabled}
            size="md"
            fullWidth
            style={styles.footerButton}
            testID="start"
          />
        )}
      </View>
      {moduleKey && hasHelp && (
        <HelpSheet
          moduleKey={moduleKey}
          pages={helpPages}
          visible={helpOpen}
          onClose={() => setHelpOpen(false)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  hint: {
    marginBottom: spacing.sm,
    fontSize: fontSize.xs,
    textAlign: "center",
  },
  modeButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  // 14pt, not the medium size's 16: the reference footer's height.
  footerButton: {
    paddingVertical: 14,
  },
  // The two buttons split the row evenly, whatever their labels' widths.
  // Narrower side padding than the medium size's own, so a long label
  // ("Entrenamiento") stays on one line in half a phone's width.
  half: {
    flex: 1,
    flexBasis: 0,
    paddingHorizontal: spacing.sm,
  },
});
