import { Fragment, useState } from "react";
import type { ReactNode } from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { useTranslation } from "react-i18next";
import { isBlackToMoveFromFen } from "@blindfold-chess/features/chess-core/fen";
import {
  FEN_PROBLEMS,
  getPositionName,
  type CustomFenError,
  type FenSettings,
} from "@blindfold-chess/features/fen-practice";

import {
  ListRow,
  ListSection,
  SelectRow,
  SwitchRow,
} from "../../../components";
import { useTheme, spacing, fontSize, monoFont } from "../../../theme";
import { FenBoard } from "./FenBoard";
import { SourceSwitch } from "./SourceSwitch";

/**
 * Width a preview board leaves of the screen: the setup screen's 24pt
 * padding, the panel's hairline borders and the preview's own 16pt padding,
 * on both sides.
 */
const PREVIEW_INSET = spacing.lg * 2 + 2 + spacing.md * 2;

type FenSettingsFormProps = {
  settings: FenSettings;
  onUpdate: (patch: Partial<FenSettings>) => void;
  /** How many FENs the chosen source offers; bounds the problem count. */
  availableCount: number;
  customFenError: CustomFenError | null;
  /**
   * Leave out the previewable list of built-in problems. Position memory
   * sets it: previewing a position there would be memorising it early, and
   * its built-in set is not the FEN drill's.
   */
  hidePresetList?: boolean;
  /** Caption of the panel holding the problem count and shuffle. */
  settingsTitle: string;
  /** A row of the module's own put first on that panel (position memory's time). */
  leadingSettingRow?: ReactNode;
};

/**
 * The web's FEN setup form as grouped panels: the problem source toggle,
 * then either the built-in problems (each opens a preview of its position
 * under it) or the player's own FEN list, then the problem count and
 * shuffle. The web's range slider becomes a row that picks the count in a
 * sheet, since there are never more than ten problems; the count and the
 * shuffle appear on the same conditions as the web's (two problems to
 * choose from; more than one chosen).
 */
export function FenSettingsForm({
  settings,
  onUpdate,
  availableCount,
  customFenError,
  hidePresetList = false,
  settingsTitle,
  leadingSettingRow,
}: FenSettingsFormProps) {
  const { t } = useTranslation();

  const selectedCount = Math.min(settings.problemCount, availableCount);
  const countOptions = Array.from({ length: availableCount }, (_, i) => i + 1);
  const showCount = availableCount >= 2;
  const showShuffle = selectedCount > 1;

  return (
    <>
      <ListSection title={t("fen.setup.problemSource")}>
        <View style={styles.switchRow}>
          <SourceSwitch
            options={[
              { value: "preset", label: t("fen.setup.presetProblems") },
              { value: "custom", label: t("fen.setup.enterFen") },
            ]}
            value={settings.useCustomFen ? "custom" : "preset"}
            onChange={(source) =>
              onUpdate({ useCustomFen: source === "custom" })
            }
          />
        </View>
      </ListSection>

      {settings.useCustomFen ? (
        <CustomFenSection
          input={settings.customFenInput}
          error={customFenError}
          onChange={(customFenInput) => onUpdate({ customFenInput })}
        />
      ) : hidePresetList ? null : (
        <PresetSection />
      )}

      {(leadingSettingRow || showCount || showShuffle) && (
        <ListSection title={settingsTitle}>
          {leadingSettingRow}
          {showCount && (
            <SelectRow
              label={t("fen.setup.problemCount")}
              options={countOptions}
              value={selectedCount}
              onChange={(problemCount) => onUpdate({ problemCount })}
              formatOption={String}
              testID="problem-count"
            />
          )}
          {showShuffle && (
            <SwitchRow
              label={t("fen.setup.shuffle")}
              value={settings.shuffleProblems}
              onChange={(shuffleProblems) => onUpdate({ shuffleProblems })}
              testID="shuffle"
            />
          )}
        </ListSection>
      )}
    </>
  );
}

/**
 * The built-in problems, one row each. A row opens its position right under
 * it rather than below the whole list as the web does: at phone height the
 * list alone fills the screen, and a preview after it would open out of
 * sight of the row that was tapped.
 */
function PresetSection() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [previewId, setPreviewId] = useState<string | null>(null);

  return (
    <ListSection title={t("fen.setup.presetDescription")}>
      {FEN_PROBLEMS.map((problem) => {
        const open = problem.id === previewId;
        return (
          <Fragment key={problem.id}>
            <ListRow
              title={getPositionName(problem, i18n.language)}
              accessory={open ? "check" : "none"}
              onPress={() => setPreviewId(open ? null : problem.id)}
              testID={`preset-${problem.id}`}
            />
            {open && (
              <View
                style={[styles.preview, { backgroundColor: colors.background }]}
              >
                <FenBoard
                  fen={problem.fen}
                  flipped={isBlackToMoveFromFen(problem.fen)}
                  horizontalInset={PREVIEW_INSET}
                  showCoordinates
                />
              </View>
            )}
          </Fragment>
        );
      })}
    </ListSection>
  );
}

function CustomFenSection({
  input,
  error,
  onChange,
}: {
  input: string;
  error: CustomFenError | null;
  onChange: (input: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <ListSection title={t("fen.setup.customFenDescription")}>
      <TextInput
        value={input}
        onChangeText={onChange}
        placeholder={t("fen.setup.customFenPlaceholder")}
        placeholderTextColor={colors.mutedForeground}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        testID="custom-fen-input"
        style={[styles.input, { color: colors.foreground }]}
      />
      {error && (
        <Text style={[styles.error, { color: colors.destructive }]}>
          {formatCustomFenError(error, t)}
        </Text>
      )}
    </ListSection>
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
  switchRow: {
    padding: spacing.sm + 4,
  },
  preview: {
    padding: spacing.md,
  },
  // The web's `h-32` textarea in `font-mono text-sm`.
  input: {
    minHeight: 128,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 4,
    paddingBottom: spacing.sm + 4,
    fontFamily: monoFont,
    fontSize: fontSize.sm,
    textAlignVertical: "top",
  },
  error: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
  },
});
