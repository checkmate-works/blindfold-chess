import { StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  PLAYER_RESULTS,
  isValidSkillLevel,
} from "@blindfold-chess/features/ai-game";
import { SIDES, type Side } from "@blindfold-chess/types";

import { ResultCard } from "../../../../features/ai-game/components";
import type {
  PlayerResult,
  SkillLevel,
} from "../../../../features/ai-game/lib/types";
import { parseEnumParam, parseIntParam } from "../../../../lib/route-params";
import { Screen } from "../../../../components";
import { spacing } from "../../../../theme";

export default function AiGameResult() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    result: string;
    playerColor: string;
    skillLevel: string;
    moveCount: string;
  }>();

  const result = parseEnumParam<PlayerResult>(
    params.result,
    PLAYER_RESULTS,
    "draw",
  );
  const playerColor = parseEnumParam<Side>(params.playerColor, SIDES, "white");
  const parsedSkillLevel = Number(params.skillLevel);
  const skillLevel: SkillLevel = isValidSkillLevel(parsedSkillLevel)
    ? parsedSkillLevel
    : 5;
  const moveCount = parseIntParam(params.moveCount, { fallback: 0 });

  const handlePlayAgain = () => {
    router.replace({
      pathname: "/(tabs)/play/ai-game/setup",
    });
  };

  const handleBackToMenu = () => {
    router.replace("/(tabs)/play");
  };

  return (
    <Screen edges={["bottom"]}>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    justifyContent: "center",
    flexGrow: 1,
  },
});
