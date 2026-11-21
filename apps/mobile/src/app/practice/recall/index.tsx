import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { parsePgnWithFen } from "@blindfold-chess/features/chess-core";
import { SIDES } from "@blindfold-chess/types";

import {
  Button,
  ListSection,
  OptionsField,
  PracticeSetupScreen,
  SwitchRow,
} from "../../../components";
import {
  SAMPLE_PGN,
  useRecallSettings,
} from "../../../features/recall/settings";
import {
  useTheme,
  borderRadius,
  fontSize,
  fontWeight,
  spacing,
} from "../../../theme";

/**
 * Recall setup (the web's `/practice/recall`): paste a PGN, pick the side to
 * recall, and whether the other side's moves are played automatically. The
 * web's Lichess import and "my games" sources need the server and the web's
 * saved games, so the app offers a sample game instead.
 */
export default function RecallSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { settings, isLoaded, updateSettings } = useRecallSettings();
  const [error, setError] = useState(false);

  const handleStart = () => {
    const parsed = parsePgnWithFen(settings.pgn);
    if (!parsed.ok || parsed.value.moves.length === 0) {
      setError(true);
      return;
    }
    router.push({
      pathname: "/practice/recall/session",
      params: {
        pgn: settings.pgn,
        color: settings.playerColor,
        auto: settings.autoOpponent ? "1" : "0",
      },
    });
  };

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded}
      startLabel={t("recall.setup.startButton")}
      onStart={handleStart}
      startDisabled={settings.pgn.trim() === ""}
    >
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            {t("recall.setup.pgnLabel")}
          </Text>
          <Button
            title={t("recall.setup.useSample")}
            variant="ghost"
            size="sm"
            onPress={() => {
              setError(false);
              updateSettings({ pgn: SAMPLE_PGN });
            }}
          />
        </View>
        <TextInput
          value={settings.pgn}
          onChangeText={(pgn) => {
            setError(false);
            updateSettings({ pgn });
          }}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="1. e4 e5 2. Nf3 Nc6 …"
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.input,
            {
              color: colors.foreground,
              backgroundColor: colors.card,
              borderColor: error ? colors.destructive : colors.border,
            },
          ]}
          testID="recall-pgn"
        />
        {error && (
          <Text style={[styles.error, { color: colors.destructive }]}>
            {t("recall.setup.invalidPgn")}
          </Text>
        )}
      </View>

      {/* recall.setup.sides.{white,black} */}
      <OptionsField
        label={t("recall.setup.playAs")}
        options={SIDES}
        value={settings.playerColor}
        onChange={(playerColor) => updateSettings({ playerColor })}
        formatOption={(side) => t(`recall.setup.sides.${side}`)}
      />

      <ListSection>
        <SwitchRow
          label={t("recall.autoOpponentMoves")}
          value={settings.autoOpponent}
          onChange={(autoOpponent) => updateSettings({ autoOpponent })}
        />
      </ListSection>
    </PracticeSetupScreen>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  input: {
    minHeight: 140,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.sm,
    textAlignVertical: "top",
  },
  error: {
    fontSize: fontSize.sm,
  },
});
