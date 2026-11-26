import { StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
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
import {
  BottomBar,
  ListRow,
  ListSection,
  ModeButtonRow,
  Screen,
} from "../../../../components";
import { useCloseSession } from "../../../../navigation/use-close-session";
import { spacing } from "../../../../theme";

/**
 * A finished AI game: the outcome, then where to go from it, as the web's
 * finish dialog offers — the saved game's own page (moves, PGN, recall) or
 * another game. "Play Again" reveals the setup screen underneath, which
 * still holds the settings this game was started with.
 */
export default function AiGameResult() {
  const { t } = useTranslation();
  const router = useRouter();
  const { close, closeToMenu } = useCloseSession("/play/ai-game");
  const params = useLocalSearchParams<{
    result: string;
    playerColor: string;
    skillLevel: string;
    moveCount: string;
    gameId?: string;
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
  const gameId = params.gameId;

  return (
    <Screen edges={[]}>
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
        />
        {gameId ? (
          <ListSection>
            <ListRow
              title={t("aiGame.result.review")}
              subtitle={t("aiGame.result.reviewDescription")}
              // The saved game's page is on the root stack, under this
              // modal. `dismissTo` leaves the modal for it rather than
              // pushing a root screen from inside the session stack.
              onPress={() =>
                router.dismissTo({
                  pathname: "/play/games/[id]",
                  params: { id: gameId },
                })
              }
            />
          </ListSection>
        ) : null}
      </ScrollView>
      <BottomBar>
        <ModeButtonRow
          secondary={{
            title: t("aiGame.result.backToMenu"),
            onPress: closeToMenu,
          }}
          primary={{ title: t("aiGame.result.playAgain"), onPress: close }}
        />
      </BottomBar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
});
