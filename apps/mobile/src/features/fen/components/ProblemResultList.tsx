import {
  Linking,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
import { fenToLichessUrl } from "@blindfold-chess/features/chess-core/fen";
import {
  EMPTY_BOARD_FEN,
  type FenProblemResultEntry,
} from "@blindfold-chess/features/fen-practice";

import {
  Button,
  PROBLEM_DETAILS_INSET,
  ProblemDetailsList,
  problemVerdict,
} from "../../../components";
import { fontSize, fontWeight, spacing, useTheme } from "../../../theme";
import { FenBoard } from "./FenBoard";
import { RecreationProgress } from "./RecreationResult";

/** The web's `grid-cols-2 gap-3` between the two boards. */
const BOARD_GAP = 12;

/**
 * The web result's per-problem list (`ProblemResultList`): one row per
 * problem with "No.N", the FEN and the accuracy (or "Skipped"), each
 * opening onto the original and the player's board side by side, the
 * compact recreation bar and, for position memory, a Lichess link. Rows
 * start closed, as on the web: every row is a score, not a right or wrong
 * answer, so none is singled out.
 */
export function ProblemResultList({
  results,
  showLichess = false,
}: {
  results: readonly FenProblemResultEntry[];
  /** Position memory's "Analyze on Lichess" under each open row. */
  showLichess?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const boardSize =
    (width - spacing.lg * 2 - PROBLEM_DETAILS_INSET - BOARD_GAP) / 2;

  return (
    <ProblemDetailsList
      problems={results}
      initiallyOpen="none"
      verdictOf={(result) =>
        problemVerdict({
          correct: !result.skipped && result.accuracy === 100,
          skipped: result.skipped,
        })
      }
      renderSubtitle={(result) => (
        <Text
          numberOfLines={1}
          style={[styles.fen, { color: colors.mutedForeground }]}
        >
          {result.fen}
        </Text>
      )}
      renderVerdict={(result) =>
        result.skipped ? (
          <Text style={[styles.skipped, { color: colors.mutedForeground }]}>
            {t("practiceResult.skipped")}
          </Text>
        ) : (
          <Text style={[styles.accuracy, { color: colors.foreground }]}>
            {result.accuracy.toFixed(1)}%
          </Text>
        )
      }
      renderDetails={(result) => (
        <View style={styles.details}>
          <View style={styles.boards}>
            <BoardWithCaption
              caption={t("fen.problemResult.original")}
              fen={result.fen}
              flipped={result.isBlackToMove}
              size={boardSize}
            />
            <BoardWithCaption
              caption={t("fen.problemResult.yourRecreation")}
              fen={result.skipped ? EMPTY_BOARD_FEN : result.recreatedFen}
              flipped={result.isBlackToMove}
              size={boardSize}
            />
          </View>
          {!result.skipped && <RecreationProgress counts={result} compact />}
          {showLichess && (
            <View style={styles.lichess}>
              <Button
                title={t("positionMemory.session.analyzeOnLichess")}
                icon="open-outline"
                onPress={() =>
                  void Linking.openURL(fenToLichessUrl(result.fen))
                }
                variant="secondary"
                size="sm"
              />
            </View>
          )}
        </View>
      )}
      rowTestIDPrefix="problem-"
    />
  );
}

function BoardWithCaption({
  caption,
  fen,
  flipped,
  size,
}: {
  caption: string;
  fen: string;
  flipped: boolean;
  size: number;
}) {
  const { colors } = useTheme();
  return (
    <View>
      <Text style={[styles.caption, { color: colors.mutedForeground }]}>
        {caption}
      </Text>
      <FenBoard
        fen={fen}
        flipped={flipped}
        maxSize={size}
        showCoordinates={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // `text-xs text-muted-foreground truncate`.
  fen: {
    flexShrink: 1,
    fontSize: fontSize.xs,
  },
  // `font-semibold text-sm`.
  accuracy: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    fontVariant: ["tabular-nums"],
  },
  skipped: {
    fontSize: fontSize.xs,
  },
  details: {
    gap: spacing.md,
  },
  boards: {
    flexDirection: "row",
    gap: BOARD_GAP,
  },
  // `text-xs font-medium text-muted-foreground mb-1 text-center`.
  caption: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  lichess: {
    alignItems: "center",
  },
});
