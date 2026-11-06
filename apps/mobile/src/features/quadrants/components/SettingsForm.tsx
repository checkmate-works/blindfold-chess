import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import type { QuadrantsSettings } from "@blindfold-chess/features/quadrants";
import { BOARD_ORIENTATIONS } from "@blindfold-chess/types";

import { Card, OptionsField } from "../../../components";
import { useTheme, fontSize, fontWeight, spacing } from "../../../theme";

type SettingsFormProps = {
  settings: QuadrantsSettings;
  onUpdateSettings: (patch: Partial<QuadrantsSettings>) => void;
  /** Fixed rules of the run, shown so the player knows them before starting. */
  timeLimit: number;
  mistakeLimit: number;
};

export function SettingsForm({
  settings,
  onUpdateSettings,
  timeLimit,
  mistakeLimit,
}: SettingsFormProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <OptionsField
        label={t("quadrants.setup.orientation")}
        options={BOARD_ORIENTATIONS}
        value={settings.orientation}
        onChange={(orientation) => onUpdateSettings({ orientation })}
        formatOption={(orientation) =>
          // quadrants.setup.orientationWhite, quadrants.setup.orientationBlack, quadrants.setup.orientationRandom (BOARD_ORIENTATIONS)
          t(`quadrants.setup.orientation${capitalize(orientation)}`)
        }
      />

      <Card>
        <Text style={[styles.rulesTitle, { color: colors.foreground }]}>
          {t("quadrants.setup.rulesTitle")}
        </Text>
        <Text style={[styles.rule, { color: colors.mutedForeground }]}>
          • {t("quadrants.setup.timeLimitRule", { seconds: timeLimit })}
        </Text>
        <Text style={[styles.rule, { color: colors.mutedForeground }]}>
          • {t("quadrants.setup.mistakeLimitRule", { count: mistakeLimit })}
        </Text>
      </Card>
    </View>
  );
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  rulesTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  rule: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
});
