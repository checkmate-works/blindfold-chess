import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
} from "expo-router/unstable-native-tabs";
import { Redirect } from "expo-router";
import { useTranslation } from "react-i18next";

import { useOnboardingStatus } from "../../hooks/useOnboardingStatus";

import { useTheme } from "../../theme";

/**
 * The bottom tabs: Home, Practice, Play, Learn, Settings.
 *
 * @description
 * The tab bar is the OS's own (`NativeTabs`, a `UITabBarController` on iOS
 * and a Material 3 bottom navigation on Android) rather than a JS-drawn bar.
 * On iOS 26 that is the floating Liquid Glass bar, which shrinks as the
 * content scrolls down (`minimizeBehavior`); on older iOS it is the standard
 * translucent bar. The colors set here reach Android only partly and iOS
 * hardly at all — the OS paints the bar's background and separator itself.
 *
 * Icons: iOS uses SF Symbols (filled when selected); Android has no symbol
 * set in the OS, so it gets Material Community Icons rendered to an image by
 * `VectorIcon`.
 *
 * Each tab is a stack holding only its entry screen, so that the entry
 * screen gets the native-stack header. Detail screens (a practice module's
 * setup, the AI-game setup, an article) are pushed on the root stack in
 * `app/_layout.tsx`, above the tabs, so the tab bar hides on them and the
 * same detail can be opened from several tabs without being duplicated in
 * each tab's stack.
 *
 * `NativeTabs` is an unstable expo-router API (`unstable-native-tabs`);
 * re-check these props whenever the Expo SDK is upgraded.
 *
 * The tabs are the app's entry (`/` is the home tab), so this layout is
 * also where a first launch is sent to the onboarding chat. Nothing renders
 * while the flag loads, which takes one AsyncStorage read.
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isLoading, hasCompleted } = useOnboardingStatus();

  if (isLoading) return null;
  if (!hasCompleted) return <Redirect href="/onboarding" />;

  return (
    <NativeTabs
      tintColor={colors.primary}
      minimizeBehavior="onScrollDown"
      labelStyle={{ fontSize: 11, fontWeight: "600" }}
      // Android only from here on.
      backgroundColor={colors.card}
      labelVisibilityMode="labeled"
      indicatorColor={colors.secondary}
    >
      <NativeTabs.Trigger name="(home)">
        <Label>{t("tabs.home")}</Label>
        <Icon
          sf={{ default: "house", selected: "house.fill" }}
          androidSrc={
            <VectorIcon family={MaterialCommunityIcons} name="home-variant" />
          }
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="practice">
        <Label>{t("tabs.practice")}</Label>
        <Icon
          sf={{ default: "dumbbell", selected: "dumbbell.fill" }}
          androidSrc={
            <VectorIcon family={MaterialCommunityIcons} name="dumbbell" />
          }
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="play">
        <Label>{t("tabs.play")}</Label>
        <Icon
          sf={{ default: "flag.2.crossed", selected: "flag.2.crossed.fill" }}
          androidSrc={
            <VectorIcon family={MaterialCommunityIcons} name="chess-knight" />
          }
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="learn">
        <Label>{t("tabs.learn")}</Label>
        <Icon
          sf={{ default: "book", selected: "book.fill" }}
          androidSrc={
            <VectorIcon
              family={MaterialCommunityIcons}
              name="book-open-variant"
            />
          }
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Label>{t("tabs.settings")}</Label>
        <Icon
          sf={{ default: "gearshape", selected: "gearshape.fill" }}
          androidSrc={<VectorIcon family={MaterialCommunityIcons} name="cog" />}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
