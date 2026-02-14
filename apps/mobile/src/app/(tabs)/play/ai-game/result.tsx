import { StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Side } from "@blindfold-chess/types";

import { ResultCard } from "../../../../features/ai-game/components";
import type {
  PlayerResult,
  SkillLevel,
} from "../../../../features/ai-game/lib/types";
import { useTheme, spacing } from "../../../../theme";

export default function AiGameResult() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    result: string;
    playerColor: string;
    skillLevel: string;
    moveCount: string;
  }>();

  const result = (params.result || "draw") as PlayerResult;
  const playerColor = (params.playerColor || "white") as Side;
  const skillLevel = (
    params.skillLevel ? parseInt(params.skillLevel, 10) : 5
  ) as SkillLevel;
  const moveCount = params.moveCount ? parseInt(params.moveCount, 10) : 0;

  const handlePlayAgain = () => {
    router.replace({
      pathname: "/(tabs)/play/ai-game/setup",
    });
  };

  const handleBackToMenu = () => {
    router.replace("/(tabs)/play");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ResultCard
          result={result}
          playerColor={playerColor}
          skillLevel={skillLevel}
          moveCount={moveCount}
          onPlayAgain={handlePlayAgain}
          onBackToMenu={handleBackToMenu}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    justifyContent: "center",
    flexGrow: 1,
  },
});
