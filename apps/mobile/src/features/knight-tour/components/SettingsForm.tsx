import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { RANDOM_STARTING_SQUARE } from "@blindfold-chess/features/knight-tour";
import type { KnightTourSettings } from "@blindfold-chess/features/knight-tour";
import { ALL_SQUARES } from "@blindfold-chess/features/common";

import {
  BottomSheet,
  ListRow,
  ListSection,
  SwitchRow,
} from "../../../components";
import { useTheme, spacing, fontSize } from "../../../theme";
import { KnightTourBoard } from "./KnightTourBoard";

const NO_VISITS: ReadonlyMap<string, number> = new Map();

/** The sheet's body padding on both sides (`BottomSheet`'s `spacing.lg`). */
const SHEET_INSET = spacing.lg * 2;

type SettingsFormProps = {
  settings: KnightTourSettings;
  onUpdate: (patch: Partial<KnightTourSettings>) => void;
};

/**
 * The web setup's "Settings": the starting square, blindfold mode with its
 * note, and the rule of the tour under them, as one grouped panel.
 *
 * The web picks the square from a 65-entry `<select>`. Here the row shows
 * the choice and opens a sheet with "Random" over the board, where a tap on
 * a square picks it — 64 rows of names would be a long list to scroll for
 * what the board says at a glance.
 */
export function SettingsForm({ settings, onUpdate }: SettingsFormProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const isRandom = settings.startingSquare === RANDOM_STARTING_SQUARE;

  const pick = (startingSquare: string) => {
    onUpdate({ startingSquare });
    setPickerOpen(false);
  };

  return (
    <>
      <ListSection
        title={t("common.settings")}
        footer={t("knightTour.setup.setupHint")}
      >
        <ListRow
          title={t("knightTour.setup.startingSquare")}
          value={
            isRandom
              ? t("knightTour.setup.randomSquare")
              : settings.startingSquare
          }
          onPress={() => setPickerOpen(true)}
          testID="knight-tour-starting-square"
        />
        <SwitchRow
          label={t("knightTour.setup.blindfoldMode")}
          description={t("knightTour.setup.blindfoldModeHint")}
          value={settings.blindfoldMode}
          onChange={(blindfoldMode) => onUpdate({ blindfoldMode })}
          testID="knight-tour-blindfold"
        />
      </ListSection>

      <BottomSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t("knightTour.setup.startingSquare")}
      >
        <ListSection>
          <ListRow
            title={t("knightTour.setup.randomSquare")}
            accessory={isRandom ? "check" : "none"}
            onPress={() => pick(RANDOM_STARTING_SQUARE)}
          />
        </ListSection>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          {t("knightTour.setup.pickOnBoard")}
        </Text>
        <KnightTourBoard
          currentSquare={isRandom ? "" : settings.startingSquare}
          visitedSquares={NO_VISITS}
          tappableSquares={ALL_SQUARES}
          onSquarePress={pick}
          horizontalInset={SHEET_INSET}
        />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: fontSize.sm,
    textAlign: "center",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
});
