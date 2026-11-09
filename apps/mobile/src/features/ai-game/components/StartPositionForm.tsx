import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import type { PieceColor } from "@blindfold-chess/types";

import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
} from "../../../theme";
import {
  AI_GAME_START_MODES,
  type AiGameStartMode,
  type StartResolution,
} from "../hooks/useStartPositionInput";

type StartPositionFormProps = {
  mode: AiGameStartMode;
  onChangeMode: (mode: AiGameStartMode) => void;
  fenText: string;
  onChangeFenText: (text: string) => void;
  sideToMove: PieceColor;
  onChangeSideToMove: (side: PieceColor) => void;
  pgnText: string;
  onChangePgnText: (text: string) => void;
  resolution: StartResolution;
};

/*
 * Mode labels: aiGame.setup.startModeStandard, aiGame.setup.startModePosition,
 * aiGame.setup.startModePgn.
 */
const MODE_LABEL_KEYS: Record<AiGameStartMode, string> = {
  standard: "aiGame.setup.startModeStandard",
  position: "aiGame.setup.startModePosition",
  pgn: "aiGame.setup.startModePgn",
};

const SIDES_TO_MOVE: { side: PieceColor; labelKey: string }[] = [
  { side: "w", labelKey: "aiGame.setup.white" },
  { side: "b", labelKey: "aiGame.setup.black" },
];

/**
 * The start-of-game part of the AI-game setup: a choice between the standard
 * position, a FEN and a PGN, the text input for the chosen one, and its
 * validation result. The board editor of the web position form is not
 * offered; the position is typed as a FEN instead.
 */
export function StartPositionForm({
  mode,
  onChangeMode,
  fenText,
  onChangeFenText,
  sideToMove,
  onChangeSideToMove,
  pgnText,
  onChangePgnText,
  resolution,
}: StartPositionFormProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const inputStyle = [
    styles.input,
    {
      borderColor: colors.border,
      backgroundColor: colors.input,
      color: colors.foreground,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.foreground }]}>
          {t("aiGame.setup.startMode")}
        </Text>
        <View style={styles.optionsRow}>
          {AI_GAME_START_MODES.map((option) => (
            <OptionButton
              key={option}
              label={t(MODE_LABEL_KEYS[option])}
              selected={mode === option}
              onPress={() => onChangeMode(option)}
            />
          ))}
        </View>
      </View>

      {mode === "position" && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            {t("aiGame.setup.fenLabel")}
          </Text>
          <TextInput
            value={fenText}
            onChangeText={onChangeFenText}
            placeholder={t("aiGame.setup.fenPlaceholder")}
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            style={inputStyle}
          />
          <Text style={[styles.label, { color: colors.foreground }]}>
            {t("aiGame.setup.sideToMove")}
          </Text>
          <View style={styles.optionsRow}>
            {SIDES_TO_MOVE.map(({ side, labelKey }) => (
              <OptionButton
                key={side}
                label={t(labelKey)}
                selected={sideToMove === side}
                onPress={() => onChangeSideToMove(side)}
              />
            ))}
          </View>
          {fenText.trim() !== "" && (
            <ValidationMessage resolution={resolution} />
          )}
        </View>
      )}

      {mode === "pgn" && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            {t("aiGame.setup.pgnLabel")}
          </Text>
          <TextInput
            value={pgnText}
            onChangeText={onChangePgnText}
            placeholder={t("aiGame.setup.pgnPlaceholder")}
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            style={[inputStyle, styles.pgnInput]}
          />
          {pgnText.trim() !== "" && (
            <ValidationMessage resolution={resolution} />
          )}
        </View>
      )}
    </View>
  );
}

function OptionButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.optionButton,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primary : colors.card,
        },
      ]}
    >
      <Text
        style={[
          styles.optionText,
          {
            color: selected ? colors.primaryForeground : colors.foreground,
            fontWeight: selected ? fontWeight.medium : fontWeight.normal,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/*
 * Error keys come from resolveFenStart / resolvePgnStart:
 * aiGame.setup.positionEmpty, aiGame.setup.positionInvalid,
 * aiGame.setup.positionAlreadyCheckmate, aiGame.setup.positionAlreadyStalemate,
 * aiGame.setup.positionInsufficientMaterial,
 * aiGame.setup.positionCheckCorrected, aiGame.setup.pgnEmpty,
 * aiGame.setup.invalidPgn. Success: aiGame.setup.positionValid,
 * aiGame.setup.pgnValidMoves.
 */
function ValidationMessage({ resolution }: { resolution: StartResolution }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (!resolution.ok) {
    return (
      <Text style={[styles.message, { color: colors.destructive }]}>
        {t(`aiGame.setup.${resolution.error}`)}
      </Text>
    );
  }

  const { startingFen, moves } = resolution.value;
  const text =
    moves.length > 0 || !startingFen
      ? t("aiGame.setup.pgnValidMoves", { moves: moves.length })
      : t("aiGame.setup.positionValid");
  return (
    <Text style={[styles.message, { color: colors.success }]}>{text}</Text>
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
    gap: spacing.sm,
  },
  optionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  optionText: {
    fontSize: fontSize.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: fontSize.sm,
    fontFamily: "monospace",
    minHeight: 64,
    textAlignVertical: "top",
  },
  pgnInput: {
    minHeight: 160,
  },
  message: {
    fontSize: fontSize.sm,
  },
});
