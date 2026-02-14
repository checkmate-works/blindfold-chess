import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
} from "../../../theme";
import type { RoutePlannerPieceType } from "../lib/types";
import { ROUTE_PLANNER_PIECES, PIECE_DISPLAY_MAP } from "../lib/types";

type SettingsFormProps = {
  problemCount: number;
  selectedPieces: RoutePlannerPieceType[];
  onUpdateProblemCount: (count: number) => void;
  onTogglePiece: (piece: RoutePlannerPieceType) => void;
};

const PROBLEM_COUNT_OPTIONS = [3, 5, 10, 15];

export function SettingsForm({
  problemCount,
  selectedPieces,
  onUpdateProblemCount,
  onTogglePiece,
}: SettingsFormProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Problem Count */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.foreground }]}>
          {t("routePlanner.setup.problemCount")}
        </Text>
        <View style={styles.optionsRow}>
          {PROBLEM_COUNT_OPTIONS.map((count) => (
            <TouchableOpacity
              key={count}
              onPress={() => onUpdateProblemCount(count)}
              style={[
                styles.optionButton,
                {
                  borderColor:
                    problemCount === count ? colors.primary : colors.border,
                  backgroundColor:
                    problemCount === count ? colors.primary : colors.card,
                },
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  {
                    color:
                      problemCount === count
                        ? colors.primaryForeground
                        : colors.foreground,
                    fontWeight:
                      problemCount === count
                        ? fontWeight.medium
                        : fontWeight.normal,
                  },
                ]}
              >
                {t("routePlanner.setup.problemUnit", { count })}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Piece Selection */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.foreground }]}>
          {t("routePlanner.setup.pieceSelection")}
        </Text>
        <View style={styles.optionsRow}>
          {ROUTE_PLANNER_PIECES.map((piece) => {
            const isSelected = selectedPieces.includes(piece);
            return (
              <TouchableOpacity
                key={piece}
                onPress={() => onTogglePiece(piece)}
                style={[
                  styles.pieceButton,
                  {
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: isSelected ? colors.primary : colors.card,
                  },
                ]}
              >
                <Text style={styles.pieceIcon}>{PIECE_DISPLAY_MAP[piece]}</Text>
                <Text
                  style={[
                    styles.pieceLabel,
                    {
                      color: isSelected
                        ? colors.primaryForeground
                        : colors.foreground,
                    },
                  ]}
                >
                  {t(`routePlanner.pieces.${piece}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  optionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  optionText: {
    fontSize: fontSize.sm,
  },
  pieceButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 56,
  },
  pieceIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  pieceLabel: {
    fontSize: fontSize.xs,
  },
});
