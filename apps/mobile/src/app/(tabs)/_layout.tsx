import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { NativeTabs } from "expo-router/native-tabs";
import { Redirect } from "expo-router";
import { useTranslation } from "react-i18next";

import { useInProgressGameCount } from "../../features/game-history/useInProgressGameCount";
import { useOnboardingStatus } from "../../hooks/useOnboardingStatus";

import { useTheme } from "../../theme";

/**
 * The bottom tabs: Home, Dojo, Play, Practice, Learn.
 *
 * @description
 * The tab bar is the OS's own (`NativeTabs`, a `UITabBarController` on iOS
 * and a Material 3 bottom navigation on Android) rather than a JS-drawn bar.
 * On iOS 26 that is the floating Liquid Glass bar, which shrinks as the
 * content scrolls down (`minimizeBehavior`); on older iOS it is the standard
 * translucent bar. The colors set here reach Android only partly and iOS
 * hardly at all — the OS paints the bar's background and separator itself.
 *
 * The selected tab is ink (`colors.foreground`), unselected labels are
 * muted, and Android's selection pill is the neutral `colors.muted`. The
 * accent blue is kept for the primary button and text actions, so the
 * screen's main action is the one blue thing; a blue tab bar would compete
 * with it.
 *
 * Five is the most the iOS bar shows before folding the rest into a "More"
 * tab, so settings is not a tab: the person icon in the home header opens
 * mypage, and settings is a row there.
 * The dojo sits next to home because the rank ladder is the app's spine —
 * every practice module the home screen suggests is a step on it. Play is in
 * the middle, the easiest tab to reach with a thumb: the home screen no
 * longer carries an AI-game card, so the tab is the way into a game.
 *
 * The play tab's badge counts the AI games still in progress (saved games
 * without a result), so a game left part way is not forgotten; it is hidden
 * at 0. The badge is grey (`mutedForeground`) rather than the OS's red: red
 * reads as an alert that needs handling, and a paused game is only a
 * reminder; blue is kept for the main action. On iOS only the badge's fill
 * can be set — its text is always white — so a softer pale badge is not an
 * option there.
 *
 * Icons: iOS uses SF Symbols (filled when selected); Android has no symbol
 * set in the OS, so it gets Material Community Icons rendered to an image by
 * `VectorIcon`, passed as `src` (on iOS `sf` takes priority over `src`).
 *
 * Each tab is a stack holding only its entry screen, so that the entry
 * screen gets the native-stack header. Detail screens (a practice module's
 * setup, the AI-game setup, an article) are pushed on the root stack in
 * `app/_layout.tsx`, above the tabs, so the tab bar hides on them and the
 * same detail can be opened from several tabs without being duplicated in
 * each tab's stack.
 *
 * `NativeTabs` (`expo-router/native-tabs`, `unstable-native-tabs` before
 * SDK 58) has changed shape between SDKs; re-check these props whenever the
 * Expo SDK is upgraded.
 *
 * The tabs are the app's entry (`/` is the home tab), so this layout is
 * also where a first launch is sent to the onboarding chat. Nothing renders
 * while the flag loads, which takes one AsyncStorage read.
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isLoading, hasCompleted } = useOnboardingStatus();
  const inProgressGames = useInProgressGameCount();

  if (isLoading) return null;
  if (!hasCompleted) return <Redirect href="/onboarding" />;

  return (
    <NativeTabs
      tintColor={colors.foreground}
      minimizeBehavior="onScrollDown"
      badgeBackgroundColor={colors.mutedForeground}
      labelStyle={{
        default: {
          fontSize: 11,
          fontWeight: "600",
          color: colors.mutedForeground,
        },
        selected: {
          fontSize: 11,
          fontWeight: "600",
          color: colors.foreground,
        },
      }}
      // Android only from here on.
      backgroundColor={colors.card}
      labelVisibilityMode="labeled"
      indicatorColor={colors.muted}
    >
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>{t("tabs.home")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          src={
            <NativeTabs.Trigger.VectorIcon
              family={MaterialCommunityIcons}
              name="home-variant"
            />
          }
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="dojo">
        <NativeTabs.Trigger.Label>{t("tabs.dojo")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="figure.martial.arts"
          src={
            <NativeTabs.Trigger.VectorIcon
              family={MaterialCommunityIcons}
              name="karate"
            />
          }
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="play">
        <NativeTabs.Trigger.Label>{t("tabs.play")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge hidden={inProgressGames === 0}>
          {String(inProgressGames)}
        </NativeTabs.Trigger.Badge>
        <NativeTabs.Trigger.Icon
          sf={{ default: "flag.2.crossed", selected: "flag.2.crossed.fill" }}
          src={
            <NativeTabs.Trigger.VectorIcon
              family={MaterialCommunityIcons}
              name="chess-knight"
            />
          }
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="practice">
        <NativeTabs.Trigger.Label>
          {t("tabs.practice")}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "dumbbell", selected: "dumbbell.fill" }}
          src={
            <NativeTabs.Trigger.VectorIcon
              family={MaterialCommunityIcons}
              name="dumbbell"
            />
          }
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="learn">
        <NativeTabs.Trigger.Label>{t("tabs.learn")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "book", selected: "book.fill" }}
          src={
            <NativeTabs.Trigger.VectorIcon
              family={MaterialCommunityIcons}
              name="book-open-variant"
            />
          }
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
