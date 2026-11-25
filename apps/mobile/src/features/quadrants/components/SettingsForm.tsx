import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import type { QuadrantsSettings } from "@blindfold-chess/features/quadrants";

import { BoardOrientationSelector, ListSection } from "../../../components";
import { spacing } from "../../../theme";

type SettingsFormProps = {
  settings: QuadrantsSettings;
  onUpdateSettings: (patch: Partial<QuadrantsSettings>) => void;
};

/**
 * The setup screen's "Game Settings" panel: the board orientation, the one
 * setting of the web's challenge setup. Training reads the same choice, as
 * the web's training link carries it.
 */
export function SettingsForm({
  settings,
  onUpdateSettings,
}: SettingsFormProps) {
  const { t } = useTranslation();

  return (
    <ListSection title={t("common.gameSettings")}>
      <View style={styles.body}>
        <BoardOrientationSelector
          label={t("quadrants.setup.orientation")}
          value={settings.orientation}
          onChange={(orientation) => onUpdateSettings({ orientation })}
          formatOption={(orientation) =>
            // quadrants.setup.orientationWhite, quadrants.setup.orientationBlack, quadrants.setup.orientationRandom (BOARD_ORIENTATIONS)
            t(`quadrants.setup.orientation${capitalize(orientation)}`)
          }
        />
      </View>
    </ListSection>
  );
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.md,
  },
});
