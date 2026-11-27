import Ionicons from "@expo/vector-icons/Ionicons";
import { Children, Fragment, isValidElement } from "react";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { useTheme, fontWeight, spacing, borderRadius } from "../theme";
import { SectionTitle } from "./SectionTitle";

type ListSectionProps = {
  /** The section's heading, drawn as a `SectionTitle`. */
  title?: string;
  /** Explanatory text under the group. */
  footer?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * A grouped list: rows on one rounded panel, a heading above and an optional
 * note below — the inset-grouped list of the iOS Settings app, which Android
 * apps use in the same shape for settings and menus.
 *
 * The heading is a `SectionTitle` flush with the panel's edge, 12 above the
 * panel. The panel is white with a 1px `panelBorder` and a 12pt corner; rows
 * are split by a 1px `rowSeparator` spanning the panel's full width (a full
 * 1px rather than a hairline, which vanishes on white on some devices).
 * Separators are inserted between the children here so rows do not need to
 * know whether they are last.
 */
export function ListSection({
  title,
  footer,
  children,
  style,
}: ListSectionProps) {
  const { colors } = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);

  return (
    <View style={style}>
      {title ? (
        <SectionTitle style={styles.sectionTitle}>{title}</SectionTitle>
      ) : null}
      <View
        style={[
          styles.panel,
          { backgroundColor: colors.card, borderColor: colors.panelBorder },
        ]}
      >
        {rows.map((row, index) => (
          <Fragment key={row.key ?? index}>
            {index > 0 && (
              <View
                style={[
                  styles.separator,
                  { backgroundColor: colors.rowSeparator },
                ]}
              />
            )}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

type ListRowProps = {
  title: string;
  subtitle?: string;
  /** Leading element: usually a `ListIcon`. */
  leading?: ReactNode;
  /** A value shown at the trailing edge, before the chevron. */
  value?: string;
  /**
   * An element in the value's place, before the accessory: a mark rather
   * than text, such as a `DoneMark`. Drawn after `value` when a row has
   * both.
   */
  trailing?: ReactNode;
  /** Trailing accessory. Rows with `onPress` default to a chevron. */
  accessory?: "chevron" | "check" | "none" | "external";
  onPress?: () => void;
  /**
   * A secondary action on press-and-hold (deleting the row's item). Give
   * `longPressLabel` with it: a screen reader cannot hold, so the action is
   * also offered as one of the row's accessibility actions under that name.
   */
  onLongPress?: () => void;
  longPressLabel?: string;
  disabled?: boolean;
  /**
   * What a screen reader says for the whole row, in place of its visible
   * texts read in turn. For a row whose value is a mark or bare numbers
   * (a `DoneMark`, "2 / 5"), which say nothing on their own; it replaces
   * the title too, so it names the row as well as the value. Without it the
   * row reads its title, subtitle and value.
   */
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * One row of a `ListSection`: title (and subtitle), optional leading icon,
 * trailing value or element, and accessory. Pressing paints the row
 * `colors.muted`; the row itself never moves, scales or fades, matching the
 * app's flat rule.
 *
 * @description
 * Sizes: title 15pt, subtitle 13pt (line height 18), value 15pt; padding 14
 * vertical / 16 horizontal, gap 12, at least 52 tall. The title is 600 on a
 * row that can be pressed and 500 on one that only shows information, so a
 * tappable row reads as one before it is touched.
 */
export function ListRow({
  title,
  subtitle,
  leading,
  value,
  trailing,
  accessory,
  onPress,
  onLongPress,
  longPressLabel,
  disabled = false,
  accessibilityLabel,
  testID,
}: ListRowProps) {
  const { colors } = useTheme();
  const shownAccessory = accessory ?? (onPress ? "chevron" : "none");

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled || (!onPress && !onLongPress)}
      accessibilityActions={
        onLongPress && longPressLabel
          ? [{ name: "longpress", label: longPressLabel }]
          : undefined
      }
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "longpress") onLongPress?.();
      }}
      testID={testID}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={
        shownAccessory === "check" ? { selected: true } : undefined
      }
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: colors.muted },
        disabled && styles.disabled,
      ]}
    >
      {leading}
      <View style={styles.texts}>
        <Text
          style={[
            styles.title,
            onPress ? styles.titlePressable : styles.titleStatic,
            { color: colors.foreground },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text style={[styles.value, { color: colors.mutedForeground }]}>
          {value}
        </Text>
      ) : null}
      {trailing}
      {shownAccessory === "chevron" && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.mutedForeground}
        />
      )}
      {shownAccessory === "external" && (
        <Ionicons
          name="open-outline"
          size={18}
          color={colors.mutedForeground}
        />
      )}
      {shownAccessory === "check" && (
        <Ionicons name="checkmark" size={20} color={colors.primary} />
      )}
    </Pressable>
  );
}

type ListIconProps = {
  /** An Ionicons name for the tile's icon. */
  ionicon?: keyof typeof Ionicons.glyphMap;
  /** Tile color; defaults to the theme's secondary surface. */
  tint?: string;
  /** A picture of its own instead (a chess piece icon), about 20pt. */
  children?: ReactNode;
};

/** The rounded square tile at the leading edge of a list row. */
export function ListIcon({ ionicon, tint, children }: ListIconProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.icon, { backgroundColor: tint ?? colors.secondary }]}
      importantForAccessibility="no-hide-descendants"
    >
      {children ? (
        children
      ) : ionicon ? (
        <Ionicons
          name={ionicon}
          size={18}
          color={tint ? "#ffffff" : colors.foreground}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginBottom: 12,
  },
  panel: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  separator: {
    height: 1,
  },
  footer: {
    marginTop: spacing.xs + 2,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  disabled: {
    opacity: 0.5,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
  },
  titlePressable: {
    fontWeight: fontWeight.semibold,
  },
  titleStatic: {
    fontWeight: fontWeight.medium,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  value: {
    fontSize: 15,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
