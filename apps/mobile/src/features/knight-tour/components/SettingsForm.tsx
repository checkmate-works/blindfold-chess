import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { RANDOM_STARTING_SQUARE } from "@blindfold-chess/features/knight-tour";
import type { KnightTourSettings } from "@blindfold-chess/features/knight-tour";
import { ALL_SQUARES } from "@blindfold-chess/features/common";

import { SelectableChip } from "../../../components";
import { useTheme, spacing, fontSize, fontWeight } from "../../../theme";
import { KnightTourBoard } from "./KnightTourBoard";

const NO_VISITS: ReadonlyMap<string, number> = new Map();

type SettingsFormProps = {
  settings: KnightTourSettings;
  onUpdate: (patch: Partial<KnightTourSettings>) => void;
};

/**
 * Starting square and blindfold mode. The web picks the square from a
 * 65-entry `<select>`; on a phone the board itself is the picker — tap a
 * square to start there, or choose "Random".
 */
export function SettingsForm({ settings, onUpdate }: SettingsFormProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const isRandom = settings.startingSquare === RANDOM_STARTING_SQUARE;

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.foreground }]}>
          {t("knightTour.setup.startingSquare")}
          {isRandom ? "" : `: ${settings.startingSquare}`}
        </Text>
        <View style={styles.row}>
          <SelectableChip
            label={t("knightTour.setup.randomSquare")}
            selected={isRandom}
            onPress={() => onUpdate({ startingSquare: RANDOM_STARTING_SQUARE })}
          />
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          {t("knightTour.setup.pickOnBoard")}
        </Text>
        <KnightTourBoard
          currentSquare={isRandom ? "" : settings.startingSquare}
          visitedSquares={NO_VISITS}
          tappableSquares={ALL_SQUARES}
          onSquarePress={(square) => onUpdate({ startingSquare: square })}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <SelectableChip
            label={t("knightTour.setup.blindfoldMode")}
            selected={settings.blindfoldMode}
            onPress={() => onUpdate({ blindfoldMode: !settings.blindfoldMode })}
          />
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          {t("knightTour.setup.blindfoldModeHint")}
        </Text>
      </View>

      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        {t("knightTour.setup.setupHint")}
      </Text>
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
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  hint: {
    fontSize: fontSize.sm,
  },
});
