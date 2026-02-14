import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { useTranslation } from "react-i18next";
import { SpinnerIcon } from "@blindfold-chess/icons";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
} from "../../../theme";
import type { GameStatus, SkillLevel } from "../lib/types";

type GameInfoProps = {
  isPlayerTurn: boolean;
  isAiThinking: boolean;
  gameStatus: GameStatus;
  skillLevel: SkillLevel;
  moveCount: number;
};

function Spinner({ color, size = 16 }: { color: string; size?: number }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <SpinnerIcon size={size} color={color} />
    </Animated.View>
  );
}

export function GameInfo({
  isPlayerTurn,
  isAiThinking,
  gameStatus,
  skillLevel,
  moveCount,
}: GameInfoProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const getStatusText = () => {
    if (gameStatus === "checkmate") return t("aiGame.session.checkmate");
    if (gameStatus === "stalemate") return t("aiGame.session.stalemate");
    if (gameStatus === "draw") return t("aiGame.session.draw");
    if (isAiThinking) return t("aiGame.session.aiThinking");
    if (isPlayerTurn) return t("aiGame.session.yourTurn");
    return t("aiGame.session.aiThinking");
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.statusRow}>
        <Text style={[styles.statusText, { color: colors.foreground }]}>
          {getStatusText()}
        </Text>
        {isAiThinking && <Spinner color={colors.primary} />}
      </View>
      <View style={styles.infoRow}>
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          {t("aiGame.session.skillLevel")}: {skillLevel}
        </Text>
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          {t("aiGame.session.moves")}: {moveCount}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoText: {
    fontSize: fontSize.sm,
  },
});
