import { useCallback, useEffect, useRef, useState } from "react";
import type { ScrollViewInstance } from "react-native";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  EMPTY_BOARD_FEN,
  selectInitialPositions,
  summarizeFenSession,
} from "@blindfold-chess/features/fen-practice";
import {
  useFenPracticeSession,
  usePieceAccuracy,
} from "@blindfold-chess/features/fen-practice/client";

import { Button, ProgressBar, Screen } from "../../../../components";
import {
  BoardTools,
  FenBoardEditor,
  FenDisplay,
  ProblemRecreationResult,
  SessionLinks,
  confirmQuit,
} from "../../../../features/fen/components";
import {
  isBoardEmpty,
  useProblemOrientation,
} from "../../../../features/fen/lib/board";
import {
  parseFenSessionParams,
  serializeFenResultParams,
  type FenSessionParams,
} from "../../../../features/fen/lib/route-params";
import { useTheme, spacing, fontSize } from "../../../../theme";

/**
 * The FEN drill's run, stacked top-down as the web's `FenRecreate`: the
 * progress, the FEN to read, the board tools and the editable board, Submit,
 * then the skip / quit links. After Submit the same column shows the
 * problem's result and the button to the next one. The stack header
 * carries the module's name and the ×.
 */
export default function FenSession() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<FenSessionParams>();

  // `usePieceAccuracy` resolves `pieceNames.<piece>` / `scoreDescriptions.<kind>`
  // relative to the namespace it is handed; on mobile that is `fen`, and the
  // web's `{piece}` placeholders are `{{piece}}` in the i18next resources.
  const translateFen = useCallback(
    (key: string, values?: Record<string, string>) => t(`fen.${key}`, values),
    [t],
  );
  const { pieceNames, accuracyDescriptions } = usePieceAccuracy(translateFen);

  // Read once: a reshuffle on a later render would swap the problem under the
  // player's fingers.
  const [initialPositions] = useState(() => {
    const { fens, problemCount, shuffle } = parseFenSessionParams(params);
    return selectInitialPositions(
      undefined,
      fens.length > 0 ? fens : undefined,
      problemCount,
      shuffle,
    );
  });

  const session = useFenPracticeSession({
    positions: initialPositions,
    pieceNames,
    accuracyDescriptions,
  });
  const {
    positions,
    phase,
    currentProblemIndex,
    originalPosition,
    recreatedPosition,
    currentAccuracy,
  } = session;

  const [flipped, toggleFlipped] = useProblemOrientation(
    currentProblemIndex,
    originalPosition?.isBlackToMove ?? false,
  );

  // Each problem starts at the top of the column, where its FEN is.
  const scrollRef = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentProblemIndex, phase]);

  // Hand the summary to the result screen once the session ends, replacing
  // this route so "back" cannot re-enter a finished session. `session` is a
  // new object every render, so the ref keeps the hand-off to a single
  // navigation.
  const handedOff = useRef(false);
  useEffect(() => {
    if (phase !== "result" || handedOff.current) return;
    handedOff.current = true;
    const summary = summarizeFenSession(session);
    router.replace({
      pathname: "/practice/fen/result",
      params: serializeFenResultParams(summary, positions.length),
    });
  }, [phase, session, positions.length, router]);

  // Blank while the hand-off to the result screen is in flight.
  if (!originalPosition || phase === "result") {
    return <Screen>{null}</Screen>;
  }

  const isLastProblem = currentProblemIndex >= positions.length - 1;

  return (
    <Screen edges={["bottom", "left", "right"]}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        {positions.length > 1 && (
          <ProgressBar
            current={currentProblemIndex + 1}
            total={positions.length}
          />
        )}

        {phase === "recreate" && (
          <>
            <View>
              <Text style={[styles.prompt, { color: colors.mutedForeground }]}>
                {t("fen.session.recreateFromFen")}
              </Text>
              <FenDisplay fen={originalPosition.fen} />
            </View>

            <View style={styles.board}>
              <View style={styles.toolsRow}>
                <BoardTools
                  boardEmpty={isBoardEmpty(recreatedPosition)}
                  onClear={() => session.setRecreatedPosition(EMPTY_BOARD_FEN)}
                  onFlip={toggleFlipped}
                />
              </View>
              <FenBoardEditor
                // A fresh editor per problem resets the palette to its default.
                key={currentProblemIndex}
                fen={recreatedPosition}
                onFenChange={session.setRecreatedPosition}
                flipped={flipped}
              />
            </View>

            <Button
              title={t("fen.session.submit")}
              onPress={session.submit}
              size="lg"
              fullWidth
              testID="submit"
            />

            <SessionLinks
              links={[
                {
                  label: t("fen.session.skip"),
                  onPress: session.skip,
                  testID: "skip",
                },
                {
                  label: t("fen.session.quit"),
                  onPress: () => confirmQuit(t, session.finish),
                  testID: "quit",
                },
              ]}
            />
          </>
        )}

        {phase === "problem-result" && currentAccuracy && (
          <ProblemRecreationResult
            accuracy={currentAccuracy}
            originalFen={originalPosition.fen}
            recreatedFen={recreatedPosition}
            flipped={originalPosition.isBlackToMove}
            isLastProblem={isLastProblem}
            onNextProblem={session.nextProblem}
            onViewResults={session.finish}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // The web's `gap-6` column; the links' `space-y-4` is close enough to share it.
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  // `text-lg text-muted-foreground mb-3`.
  prompt: {
    fontSize: fontSize.lg,
    marginBottom: 12,
  },
  board: {
    gap: spacing.sm,
  },
  // `flex justify-end mb-2` over the board.
  toolsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
});
