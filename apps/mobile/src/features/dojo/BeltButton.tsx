import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text } from "react-native";
import type { RankSlug } from "@blindfold-chess/features/dojo-ranks";

import {
  borderRadius,
  controlLabel,
  controlSize,
  spacing,
  useTheme,
} from "../../theme";
import { beltColors } from "./belt";

/**
 * A rank card's main button, in the colours of the rank's belt: a faint
 * wash of the belt (`tint`) for its face, the belt itself (`fill`) for its
 * border, and the text colour chosen for that wash (`tintText`). Held down,
 * the face turns to `tintPressed`.
 *
 * @description
 * Inside a rank's card the button and the "stage in progress" cell take the
 * belt's colour, never the app's default green or primary. The card already
 * wears the belt on its band and badge, and a green button there would read
 * as part of the rank — the 2kyu belt is green, so on any other rank's card
 * a green button would seem to belong to 2kyu.
 *
 * Its geometry matches `Button`'s `md` size so it sits in the same rhythm as
 * the app's other buttons: corner `borderRadius.button`, 48pt minimum height,
 * semibold 15pt label.
 */
export function BeltButton({
  slug,
  title,
  icon,
  onPress,
  testID,
}: {
  readonly slug: RankSlug;
  readonly title: string;
  readonly icon?: keyof typeof Ionicons.glyphMap;
  readonly onPress: () => void;
  readonly testID?: string;
}) {
  const { colors } = useTheme();
  const belt = beltColors(slug, colors);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? belt.tintPressed : belt.tint,
          borderColor: belt.fill,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={belt.tintText} /> : null}
      <Text style={[styles.title, { color: belt.tintText }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    ...controlSize.md,
    borderWidth: 1,
    borderRadius: borderRadius.button,
  },
  title: {
    flexShrink: 1,
    ...controlLabel,
    textAlign: "center",
  },
});
