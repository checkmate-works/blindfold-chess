import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import type { ExamPattern } from "@blindfold-chess/features/dojo-journey";

import { ListRow, ListSection, StaticBoard } from "../../components";
import { useFenSquares } from "../../components/use-fen-squares";
import { useTheme } from "../../theme";

/** The thumbnail's side, in points: the web's `w-16`. */
const THUMBNAIL_SIZE = 64;

function PatternThumbnail({ fen }: { fen: string }) {
  const renderSquare = useFenSquares(fen);
  return (
    <View style={styles.thumbnail}>
      <StaticBoard
        maxSize={THUMBNAIL_SIZE}
        showCoordinates={false}
        renderSquare={renderSquare}
      />
    </View>
  );
}

/**
 * The web exam page's "Useful patterns for solving": a row that opens the
 * list, closed at first since a puzzle's pattern hints at its answer, then
 * one row per pattern with its board, name and description. The patterns
 * are constants of the exam (`DOJO_EXAMS`), not chunks, so a row opens
 * nothing.
 */
export function ExamPatternList({
  patterns,
}: {
  patterns: readonly ExamPattern[];
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  if (patterns.length === 0) return null;

  return (
    <ListSection>
      <ListRow
        title={t("dojo.exam.patternsSection")}
        value={String(patterns.length)}
        accessory="none"
        trailing={
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.mutedForeground}
          />
        }
        onPress={() => setOpen(!open)}
        testID="exam-patterns-toggle"
      />
      {open
        ? patterns.map((pattern) => (
            <ListRow
              key={pattern.key}
              leading={<PatternThumbnail fen={pattern.fen} />}
              // dojo.exam.patterns.<ExamPatternKey>: kingside_castle,
              // kingside_fianchetto, smothered_mate
              title={t(`dojo.exam.patterns.${pattern.key}.title`)}
              subtitle={t(`dojo.exam.patterns.${pattern.key}.description`)}
              testID={`exam-pattern-${pattern.key}`}
            />
          ))
        : null}
    </ListSection>
  );
}

const styles = StyleSheet.create({
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
  },
});
