import { useRef } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";

import {
  borderRadius,
  controlLabel,
  controlSize,
  fontSize,
  spacing,
  useTheme,
} from "../../theme";
import type { LikeTarget } from "./likes-api";
import { useLike } from "./use-like";

/**
 * The full-width like on a result screen — the web's `ResultLikeCta`: a
 * stronger ask than a small heart, right above the footer's buttons where
 * the player's attention is once they finish. Hidden when the player had
 * already liked the content before arriving; once shown it stays, and a
 * second press takes the like back.
 */
export function ResultLikeButton({
  target,
  label,
  likedLabel,
  testID,
}: {
  target: LikeTarget;
  /** "Like this puzzle". */
  label: string;
  /** "Liked". */
  likedLabel: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  const like = useLike(target);
  // Pinned to the first answer, as the web pins it to the state at mount:
  // read live, the button would vanish the moment it is pressed.
  const likedOnLoad = useRef<boolean | undefined>(undefined);
  if (likedOnLoad.current === undefined && like.state) {
    likedOnLoad.current = like.state.liked;
  }

  if (!like.available || likedOnLoad.current === true) return null;
  const liked = like.state?.liked ?? false;

  return (
    <Pressable
      onPress={like.press}
      disabled={like.pending}
      accessibilityRole="button"
      accessibilityState={{ selected: liked, busy: like.pending }}
      testID={testID}
      style={({ pressed }) => [
        styles.result,
        {
          borderColor: colors.like,
          backgroundColor: liked || pressed ? colors.likeTint : colors.card,
        },
      ]}
    >
      <Ionicons
        name={liked ? "heart" : "heart-outline"}
        size={20}
        color={colors.like}
      />
      <Text style={[styles.resultLabel, { color: colors.like }]}>
        {liked ? likedLabel : label}
      </Text>
    </Pressable>
  );
}

/**
 * The heart with its count under a piece of content — the web's
 * `LikeToggleButton`. The count is the total only; who liked is never shown
 * (the app shows no other user).
 */
export function LikeToggle({
  target,
  testID,
}: {
  target: LikeTarget;
  testID?: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const like = useLike(target);
  if (!like.available) return null;
  const liked = like.state?.liked ?? false;
  const count = like.state?.likeCount;

  return (
    <Pressable
      onPress={like.press}
      disabled={like.pending}
      accessibilityRole="button"
      accessibilityLabel={
        count === undefined
          ? t(liked ? "likes.unlike" : "likes.like")
          : t(liked ? "likes.unlikeWithCount" : "likes.likeWithCount", {
              count,
            })
      }
      accessibilityState={{ selected: liked, busy: like.pending }}
      testID={testID}
      style={({ pressed }) => [
        styles.toggle,
        {
          borderColor: colors.panelBorder,
          backgroundColor: liked || pressed ? colors.likeTint : colors.card,
        },
      ]}
    >
      <Ionicons
        name={liked ? "heart" : "heart-outline"}
        size={20}
        color={liked ? colors.like : colors.mutedForeground}
      />
      {count !== undefined && (
        <Text
          style={[
            styles.count,
            { color: liked ? colors.like : colors.mutedForeground },
          ]}
        >
          {count}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  result: {
    ...controlSize.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.button,
  },
  resultLabel: {
    ...controlLabel,
  },
  toggle: {
    ...controlSize.sm,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: 999,
  },
  count: {
    fontSize: fontSize.sm,
    fontVariant: ["tabular-nums"],
  },
});
