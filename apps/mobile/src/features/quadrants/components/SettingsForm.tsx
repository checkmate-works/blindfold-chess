import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import type { QuadrantsSettings } from "@blindfold-chess/features/quadrants";
import { BOARD_ORIENTATIONS } from "@blindfold-chess/types";

import { OptionsField } from "../../../components";
import { spacing } from "../../../theme";

type SettingsFormProps = {
  settings: QuadrantsSettings;
  onUpdateSettings: (patch: Partial<QuadrantsSettings>) => void;
};

export function SettingsForm({
  settings,
  onUpdateSettings,
}: SettingsFormProps) {
  const { t } = useTranslation();

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
});
