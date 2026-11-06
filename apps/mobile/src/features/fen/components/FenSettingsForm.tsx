import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import { isBlackToMoveFromFen } from "@blindfold-chess/features/chess-core/fen";
import {
  FEN_PROBLEMS,
  getPositionName,
  type CustomFenError,
  type FenSettings,
} from "@blindfold-chess/features/fen-practice";

import { OptionsField, SelectableChip } from "../../../components";
import {
  useTheme,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  feedbackColors,
} from "../../../theme";
import { FenBoard } from "./FenBoard";

type FenSettingsFormProps = {
  settings: FenSettings;
  onUpdate: (patch: Partial<FenSettings>) => void;
  /** How many FENs the chosen source offers; bounds the problem count. */
  availableCount: number;
  customFenError: CustomFenError | null;
};

/**
 * Problem source (built-in problems or the player's own FEN list), problem
 * count and shuffle. The web's range slider becomes a row of chips, since
 * there are never more than ten problems to choose between.
 */
export function FenSettingsForm({
  settings,
  onUpdate,
  availableCount,
  customFenError,
}: FenSettingsFormProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const preview = FEN_PROBLEMS.find((p) => p.id === previewId) ?? null;

  const selectedCount = Math.min(settings.problemCount, availableCount);
  const countOptions = Array.from({ length: availableCount }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      <OptionsField
        label={t("fen.setup.problemSource")}
        options={[false, true] as const}
        value={settings.useCustomFen}
        onChange={(useCustomFen) => onUpdate({ useCustomFen })}
        formatOption={(custom) =>
          custom ? t("fen.setup.enterFen") : t("fen.setup.presetProblems")
        }
      />

      {settings.useCustomFen ? (
        <View style={styles.section}>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            {t("fen.setup.customFenDescription")}
          </Text>
          <TextInput
            value={settings.customFenInput}
            onChangeText={(customFenInput) => onUpdate({ customFenInput })}
            placeholder={t("fen.setup.customFenPlaceholder")}
            placeholderTextColor={colors.mutedForeground}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: customFenError
                  ? feedbackColors.error
                  : colors.border,
                backgroundColor: colors.card,
              },
            ]}
          />
          {customFenError && (
            <Text style={[styles.hint, { color: feedbackColors.error }]}>
              {formatCustomFenError(customFenError, t)}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            {t("fen.setup.presetDescription")}
          </Text>
          {FEN_PROBLEMS.map((problem) => {
            const selected = problem.id === previewId;
            return (
              <TouchableOpacity
                key={problem.id}
                onPress={() => setPreviewId(selected ? null : problem.id)}
                style={[
                  styles.presetItem,
                  {
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: colors.card,
                  },
                ]}
              >
                <Text style={[styles.presetName, { color: colors.foreground }]}>
                  {getPositionName(problem, i18n.language)}
                </Text>
              </TouchableOpacity>
            );
          })}
          {preview && (
            <FenBoard
              fen={preview.fen}
              flipped={isBlackToMoveFromFen(preview.fen)}
            />
          )}
        </View>
      )}

      {availableCount >= 2 && (
        <OptionsField
          label={t("fen.setup.problemCount")}
          options={countOptions}
          value={selectedCount}
          onChange={(problemCount) => onUpdate({ problemCount })}
          formatOption={String}
        />
      )}

      {selectedCount > 1 && (
        <View style={styles.row}>
          <SelectableChip
            label={t("fen.setup.shuffle")}
            selected={settings.shuffleProblems}
            onPress={() =>
              onUpdate({ shuffleProblems: !settings.shuffleProblems })
            }
          />
        </View>
      )}
    </View>
  );
}

function formatCustomFenError(
  error: CustomFenError,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  if (error.kind === "tooMany") {
    return t("fen.setup.tooManyFens", { max: error.max });
  }
  const lines = error.lines.join(", ");
  return error.lines.length > 1
    ? t("fen.setup.invalidFenOnLines", { lines })
    : t("fen.setup.invalidFenOnLine", { lines });
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  hint: {
    fontSize: fontSize.sm,
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: fontSize.sm,
    textAlignVertical: "top",
  },
  presetItem: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  presetName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
