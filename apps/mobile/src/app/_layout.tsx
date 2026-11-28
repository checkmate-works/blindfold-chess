import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { initI18n } from "../i18n";
import { GamePreferencesProvider } from "../lib/game-preferences";
import { ALL_MODULE_ROUTES } from "../navigation/module-routes";
import { moduleSetupScreens } from "../navigation/module-stack-screens";
import {
  SHEET_SCREEN_OPTIONS,
  useStackScreenOptions,
} from "../navigation/stack-options";
import { ThemeProvider, useTheme } from "../theme";

function RootLayoutContent() {
  const { colors, isDark } = useTheme();
  const [i18nInitialized, setI18nInitialized] = useState(false);

  useEffect(() => {
    initI18n()
      .then(() => {
        setI18nInitialized(true);
      })
      .catch((error: unknown) => {
        console.error("Failed to initialize i18n:", error);
        setI18nInitialized(true);
      });
  }, []);

  if (!i18nInitialized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.page,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <RootStack isDark={isDark} />;
}

/**
 * The root native stack.
 *
 * @description
 * - `(tabs)` — the bottom tabs, each a stack holding only its entry screen.
 * - Detail screens (each module's setup at `practice/<slug>`, the AI-game
 *   setup at `play/ai-game`, articles under `learn/`, the dojo's ranks,
 *   guides, exams and requirements) are pushed here, above the tabs, so the
 *   tab bar hides on them and one detail can be opened from any tab.
 * - `(session)` — timed sessions, results and training runs, presented as a
 *   full-screen modal. It has no swipe to dismiss, so a timed run cannot be
 *   abandoned by an accidental edge swipe; its screens close it with
 *   `useCloseSession`.
 * - The account's pages — mypage, settings, My Records, its full results
 *   list and the user's ranks — are detail screens too, pushed here. They
 *   are places to browse that lead on to other screens (My Records' "Take
 *   the Challenge" opens a setup), and only a screen on this stack can do
 *   that and still come back with the back button: a root-stack screen
 *   pushed from inside a modal opens under the modal on iOS, so the modal
 *   would have to close first and take the way back with it.
 * - `(account)` — welcome, sign-in, sign-up and username setup: a task that
 *   ends where it was opened from, as a stack inside one card-style modal,
 *   closed from its header.
 * - `glossary/[slug]` — a sheet as tall as the term (`formSheet` with a
 *   grabber, sized to its content): a term is read and dismissed without
 *   losing one's place, and can be opened from anywhere.
 */
function RootStack({ isDark }: { isDark: boolean }) {
  const { t } = useTranslation();
  const screenOptions = useStackScreenOptions();

  return (
    <>
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth-callback"
          options={{ headerShown: false, animation: "none" }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {moduleSetupScreens(t, ALL_MODULE_ROUTES)}
        <Stack.Screen
          name="play/games/index"
          options={{ title: t("gameHistory.title") }}
        />
        <Stack.Screen
          name="play/games/[id]"
          options={{ title: t("gameHistory.detailTitle") }}
        />
        <Stack.Screen
          name="dojo/ranks/[slug]"
          options={{ title: t("dojo.rankDetailTitle") }}
        />
        <Stack.Screen name="dojo/exams/[rank]" options={{ title: "" }} />
        <Stack.Screen
          name="dojo/exams/[rank]/[problem]"
          options={{ title: "" }}
        />
        {/* Named after its rank, set by the screen like the guide's. */}
        <Stack.Screen name="dojo/requirements/[rank]" options={{ title: "" }} />
        {/* The guide names its rank in the title, set by the screen. */}
        <Stack.Screen name="dojo/guides/[rank]" options={{ title: "" }} />
        <Stack.Screen name="learn/[slug]" options={{ title: "" }} />
        <Stack.Screen
          name="learn/glossary/index"
          options={{ title: t("glossary.title") }}
        />
        <Stack.Screen name="glossary/[slug]" options={SHEET_SCREEN_OPTIONS} />
        <Stack.Screen
          name="announcements/index"
          options={{ title: t("announcements.title") }}
        />
        {/* Named after the announcement, set by the screen. */}
        <Stack.Screen name="announcements/[slug]" options={{ title: "" }} />
        <Stack.Screen name="mypage" options={{ title: t("mypage.title") }} />
        <Stack.Screen name="settings" options={{ title: t("tabs.settings") }} />
        <Stack.Screen name="records" options={{ title: t("records.title") }} />
        <Stack.Screen
          name="records-results"
          options={{ title: t("records.results.title") }}
        />
        <Stack.Screen name="ranks" options={{ title: t("ownRanks.title") }} />
        <Stack.Screen
          name="(account)"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen
          name="(session)"
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <GamePreferencesProvider>
          <RootLayoutContent />
        </GamePreferencesProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
