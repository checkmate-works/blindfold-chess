import Ionicons from "@expo/vector-icons/Ionicons";
import { Children, Fragment, isValidElement } from "react";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
} from "../theme";

type ListSectionProps = {
  /** Small caption above the group. */
  title?: string;
  /** Explanatory text under the group. */
  footer?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * A grouped list: rows on one rounded panel with hairline separators, a
 * caption above and an optional note below — the inset-grouped list of the
 * iOS Settings app, which Android apps use in the same shape for settings
 * and menus. Separators are inserted between the children here so rows do
 * not need to know whether they are last.
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
    <View style={[styles.section, style]}>
      {title ? (
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          {title}
        </Text>
      ) : null}
      <View
        style={[
          styles.panel,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {rows.map((row, index) => (
          <Fragment key={row.key ?? index}>
            {index > 0 && (
              <View
                style={[styles.separator, { backgroundColor: colors.border }]}
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
  /** Trailing accessory. Rows with `onPress` default to a chevron. */
  accessory?: "chevron" | "check" | "none" | "external";
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
};

/**
 * One row of a `ListSection`: title (and subtitle), optional leading icon,
 * trailing value and accessory. Pressing paints the row a shade darker; the
 * row itself never moves or scales, matching the flat style of the web app.
 */
export function ListRow({
  title,
  subtitle,
  leading,
  value,
  accessory,
  onPress,
  disabled = false,
  testID,
}: ListRowProps) {
  const { colors } = useTheme();
  const shownAccessory = accessory ?? (onPress ? "chevron" : "none");

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      testID={testID}
      accessibilityRole={onPress ? "button" : undefined}
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
        <Text style={[styles.title, { color: colors.foreground }]}>
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
  /** An emoji / chess glyph, or an Ionicons name with `ionicon`. */
  glyph?: string;
  ionicon?: keyof typeof Ionicons.glyphMap;
  /** Tile color; defaults to the theme's secondary surface. */
  tint?: string;
};

/** The rounded square tile at the leading edge of a list row. */
export function ListIcon({ glyph, ionicon, tint }: ListIconProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.icon, { backgroundColor: tint ?? colors.secondary }]}
      importantForAccessibility="no-hide-descendants"
    >
      {ionicon ? (
        <Ionicons
          name={ionicon}
          size={18}
          color={tint ? "#ffffff" : colors.foreground}
        />
      ) : (
        <Text style={[styles.glyph, { color: colors.foreground }]}>
          {glyph}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.xs + 2,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    paddingHorizontal: spacing.md,
  },
  panel: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md,
  },
  footer: {
    fontSize: fontSize.xs + 1,
    paddingHorizontal: spacing.md,
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md - 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
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
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  subtitle: {
    fontSize: fontSize.sm - 1,
    lineHeight: 18,
  },
  value: {
    fontSize: fontSize.md - 1,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  glyph: {
    fontSize: 18,
  },
});
