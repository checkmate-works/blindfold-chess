import { useCallback, useEffect, useRef, useState } from "react";
import type { ScrollViewInstance } from "react-native";
import { View, Text, StyleSheet, ScrollView, Linking } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter, useLocalSearchParams } from "expo-router";
import { fenToLichessUrl } from "@blindfold-chess/features/chess-core/fen";
import {
  EMPTY_BOARD_FEN,
  selectInitialPositions,
  summarizeFenSession,
} from "@blindfold-chess/features/fen-practice";
import {
  useFenPracticeSession,
  usePieceAccuracy,
} from "@blindfold-chess/features/fen-practice/client";
import { useCountdown } from "@blindfold-chess/features/practice-session";

import { Button, ProgressBar, QuizTimer, Screen } from "../../../../components";
import {
  BoardTools,
  FenBoard,
  FenBoardEditor,
  ProblemRecreationResult,
  SessionLinks,
  confirmQuit,
} from "../../../../features/fen/components";
import {
  isBoardEmpty,
  useProblemOrientation,
} from "../../../../features/fen/lib/board";
import {
  FROM_GUIDE,
  parseFenSessionParams,
  serializeFenResultParams,
  type FenSessionParams,
} from "../../../../features/fen/lib/route-params";
import { examProblemOf } from "@blindfold-chess/features/dojo-journey";
import { parseIntParam } from "../../../../lib/route-params";
import {
  useTheme,
  spacing,
  fontSize,
  fontWeight,
  withAlpha,
} from "../../../../theme";

/**
 * Position memory (the web's multi-problem `/practice/position-memory/session`),
 * stacked top-down as the web's phases are:
 *
 * - memorize: the progress, "Memorize the Position" with the clock, the
 *   board (under the "3, 2, 1, START!" countdown before the first problem),
 *   "I've Memorized", then the skip / quit links;
 * - recreate: "Recreate" with the board tools, the empty board, Submit,
 *   then view again / skip / quit;
 * - the problem's result, as the FEN drill's.
 *
 * Scoring and the problem flow are the FEN drill's (`useFenPracticeSession`);
 * only the memorize step in front of each recreation is this screen's.
 * "View Again" returns to it with a full clock and keeps the pieces placed
 * so far (the web's machine empties the board when the step ends again).
 */
export default function PositionMemorySession() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<
    FenSessionParams & { seconds?: string; exam?: string; from?: string }
  >();
  // A dojo exam run (`exam` param) plays the exam's one problem with its own
  // clock, whatever else the link carries, so the position recreated is the
  // one the result screen sends for grading.
  const [examProblem] = useState(() =>
    examProblemOf(params.exam, "position_memory"),
  );
  const memorizeSeconds =
    examProblem?.memorizeSeconds ??
    parseIntParam(params.seconds, {
      min: 1,
      fallback: 30,
    });

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
    if (examProblem) {
      return selectInitialPositions(undefined, [examProblem.fen], 1, false);
    }
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

  // The web's pre-session countdown, once, before the first position shows.
  const { countdown } = useCountdown();

  // The index of the last problem whose memorise step is over; the step
  // runs whenever it lags the current problem.
  const [memorizedIndex, setMemorizedIndex] = useState(-1);
  const memorizing =
    phase === "recreate" && memorizedIndex < currentProblemIndex;
  const [secondsLeft, setSecondsLeft] = useState(memorizeSeconds);
  const clockRunning = memorizing && countdown === null;

  useEffect(() => {
    if (!clockRunning) return;
    setSecondsLeft(memorizeSeconds);
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const left =
        memorizeSeconds - Math.floor((Date.now() - startedAt) / 1000);
      if (left <= 0) {
        clearInterval(timer);
        setMemorizedIndex(currentProblemIndex);
      } else {
        setSecondsLeft(left);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [clockRunning, memorizeSeconds, currentProblemIndex]);

  const [flipped, toggleFlipped] = useProblemOrientation(
    currentProblemIndex,
    originalPosition?.isBlackToMove ?? false,
  );

  // Every phase change opens at the top of the column.
  const scrollRef = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentProblemIndex, phase, memorizing]);

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
      pathname: "/practice/position-memory/result",
      params: {
        ...serializeFenResultParams(summary, positions.length),
        // A dojo exam run (`dojo/exams/[rank]`) is graded on the result
        // screen, from the recreated position in `results`.
        ...(examProblem && params.exam ? { exam: params.exam } : {}),
        // A guide's problem (`from=guide`) leads back to the guide, and its
        // "play again" needs the problem it was, on the same clock.
        ...(params.from === FROM_GUIDE && !examProblem
          ? {
              from: FROM_GUIDE,
              problems: params.problems ?? "",
              ...(params.seconds ? { seconds: params.seconds } : {}),
            }
          : {}),
      },
    });
  }, [
    phase,
    session,
    positions.length,
    router,
    params.exam,
    params.from,
    params.problems,
    params.seconds,
    examProblem,
  ]);

  // Blank while the hand-off to the result screen is in flight.
  if (!originalPosition || phase === "result") {
    return <Screen>{null}</Screen>;
  }

  const isLastProblem = currentProblemIndex >= positions.length - 1;
  const quitLink = {
    label: t("fen.session.quit"),
    onPress: () => confirmQuit(t, session.finish),
    testID: "quit",
  };
  const skipLink = {
    label: t("fen.session.skip"),
    onPress: session.skip,
    testID: "skip",
  };

  return (
    <Screen edges={["bottom", "left", "right"]}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        {positions.length > 1 && (
          <ProgressBar
            current={currentProblemIndex + 1}
            total={positions.length}
          />
        )}

        {memorizing && (
          <>
            <View style={styles.memorizeHeader}>
              <Text
                style={[
                  styles.memorizeTitle,
                  { color: colors.mutedForeground },
                ]}
              >
                {t("positionMemory.session.memorize")}
              </Text>
              <View style={styles.clock}>
                <QuizTimer
                  timeRemaining={secondsLeft}
                  progress={secondsLeft / memorizeSeconds}
                  size={50}
                />
              </View>
            </View>

            <View>
              <FenBoard
                fen={originalPosition.fen}
                flipped={originalPosition.isBlackToMove}
                showCoordinates
              />
              {countdown !== null && (
                <View
                  style={[
                    styles.countdown,
                    { backgroundColor: withAlpha(colors.background, 0.95) },
                  ]}
                  testID="countdown-overlay"
                >
                  <Text
                    style={[styles.countdownText, { color: colors.foreground }]}
                  >
                    {countdown > 0 ? countdown : "START!"}
                  </Text>
                </View>
              )}
            </View>

            <Button
              title={t("positionMemory.session.memorized")}
              onPress={() => setMemorizedIndex(currentProblemIndex)}
              disabled={countdown !== null}
              size="lg"
              fullWidth
              testID="memorized"
            />

            <SessionLinks links={[skipLink, quitLink]} />
          </>
        )}

        {phase === "recreate" && !memorizing && (
          <>
            <View style={styles.recreateHeader}>
              <Text
                style={[
                  styles.recreateTitle,
                  { color: colors.mutedForeground },
                ]}
              >
                {t("positionMemory.session.recreate")}
              </Text>
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
                  label: t("positionMemory.session.viewAgain"),
                  onPress: () => setMemorizedIndex(currentProblemIndex - 1),
                  testID: "view-again",
                },
                skipLink,
                quitLink,
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
            extraActions={
              <Button
                title={t("positionMemory.session.analyzeOnLichess")}
                icon="open-outline"
                onPress={() =>
                  void Linking.openURL(fenToLichessUrl(originalPosition.fen))
                }
                variant="secondary"
                size="lg"
                fullWidth
                testID="analyze-on-lichess"
              />
            }
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // The web's `gap-6` column.
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  // `relative flex items-center justify-center min-h-[50px]`, the clock at the right.
  memorizeHeader: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  memorizeTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    textAlign: "center",
  },
  clock: {
    position: "absolute",
    right: 0,
  },
  countdown: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  // `text-8xl font-black`.
  countdownText: {
    fontSize: 96,
    fontWeight: "900",
  },
  recreateHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  recreateTitle: {
    flexShrink: 1,
    fontSize: fontSize.lg,
  },
});
