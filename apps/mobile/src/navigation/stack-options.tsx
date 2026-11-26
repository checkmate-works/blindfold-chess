import type { NativeStackNavigationOptions } from "expo-router/native-stack";
import { Stack } from "expo-router";
import { useMemo, type ReactNode } from "react";
import { Platform, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";

import { useTheme } from "../theme";

/**
 * Header options every native stack in the app shares.
 *
 * @description
 * The header is the native-stack header (a `UINavigationBar` on iOS, a
 * Material top app bar on Android), painted in the page background with no
 * hairline under it so it reads as part of the page — the flat look the web
 * app uses — rather than a coloured band. Back buttons show only the chevron
 * (`headerBackButtonDisplayMode: "minimal"`): the previous screen's title
 * next to it is long in most languages and truncates unevenly.
 *
 * The header and the content are painted with `colors.page` (white), not
 * the grey `background` color, which is the recessed fill used on panels.
 *
 * The back chevron and header icons are ink (`colors.foreground`) and the
 * title is bold (700). The accent blue is kept for what starts something —
 * the primary button — and for text actions ("Close", ghost buttons), so the
 * screen's main action is the one thing that is blue. A blue header and tab
 * bar would compete with it.
 */
export function useStackScreenOptions(): NativeStackNavigationOptions {
  const { colors } = useTheme();
  return useMemo(
    () => ({
      headerStyle: { backgroundColor: colors.page },
      headerShadowVisible: false,
      headerTintColor: colors.foreground,
      headerTitleStyle: {
        color: colors.foreground,
        fontWeight: "700",
        fontSize: 17,
      },
      headerBackButtonDisplayMode: "minimal",
      contentStyle: { backgroundColor: colors.page },
    }),
    [colors],
  );
}

type TabStackProps = {
  /** i18n key of the tab's title, shown at the left of its header. */
  titleKey: string;
  /** What the header's trailing slot shows (an entry the tab bar has no room for). */
  headerRight?: () => ReactNode;
};

/**
 * The stack inside one bottom tab: only its entry screen (`index`), with the
 * tab's title as a larger, left-aligned heading in the header row.
 *
 * @description
 * A tab's entry gets the heading at the left (22pt) and every pushed detail
 * gets the platform's small centred title, which is how most tab-based apps
 * tell "where am I" (tab) from "what am I looking at" (detail). iOS's large
 * title is not used: it collapses on scroll into the small centred title,
 * and with the floating tab bar also reacting to scroll the screen top and
 * bottom both move at once.
 *
 * On iOS 26 every header item stands on a shared Liquid Glass capsule, which
 * around a heading reads as a button. On iOS the heading is therefore a
 * custom `unstable_headerLeftItems` item with `hidesSharedBackground`
 * (Android has no capsule and keeps `headerLeft`). Unlike the pushed
 * screens, a tab's entry keeps the header's hairline: the header and the
 * tab's content are separate sections there. iOS 26's `hard` top scroll
 * edge was tried instead and draws no line at rest, only an opaque band
 * once the content scrolls under it.
 */
export function TabStack({ titleKey, headerRight }: TabStackProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const screenOptions = useStackScreenOptions();
  const title = t(titleKey);
  const heading = (
    <Text
      accessibilityRole="header"
      numberOfLines={1}
      allowFontScaling={false}
      style={[styles.tabTitle, { color: colors.foreground }]}
    >
      {title}
    </Text>
  );

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{
          title,
          headerTitle: "",
          headerRight,
          headerShadowVisible: true,
          ...(Platform.OS === "ios"
            ? {
                unstable_headerLeftItems: () => [
                  {
                    type: "custom",
                    element: heading,
                    hidesSharedBackground: true,
                  },
                ],
              }
            : { headerLeft: () => heading }),
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  tabTitle: {
    fontSize: 22,
    fontWeight: "700",
    // Line the heading up with the content's 16pt inset: the Android app bar
    // puts headerLeft 4pt short of it, iOS puts header items 20pt in.
    marginLeft: Platform.OS === "android" ? 4 : -4,
  },
});

/**
 * How the root stack presents the `sheet` group: a half-height sheet with a
 * grabber that can be dragged up to full height or down to dismiss — the
 * system sheet on iOS (`UISheetPresentationController`) and a Material
 * bottom sheet on Android. The sheet draws its own title row and ×
 * (`SheetScreen`), since a form sheet has no navigation bar on Android.
 */
export const SHEET_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  presentation: "formSheet",
  sheetAllowedDetents: [0.55, 1],
  sheetGrabberVisible: true,
  sheetCornerRadius: 20,
  headerShown: false,
};
