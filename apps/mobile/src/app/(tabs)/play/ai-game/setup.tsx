import { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import type { Side } from "@blindfold-chess/types";

import { PracticeSetupScreen } from "../../../../components";
import {
  SettingsForm,
  StartPositionForm,
} from "../../../../features/ai-game/components";
import {
  useGameSettings,
  useStartPositionInput,
} from "../../../../features/ai-game/hooks";
import { encodeStartParams } from "../../../../features/ai-game/lib/start-params";
import { spacing } from "../../../../theme";

export default function AiGameSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings, isLoaded, updateSettings } = useGameSettings();

  const derivePlayerColor = useCallback(
    (playerColor: Side) => updateSettings({ playerColor }),
    [updateSettings],
  );
  const start = useStartPositionInput({
    onDerivePlayerColor: derivePlayerColor,
  });

  const handleStart = () => {
    if (!start.resolution.ok) return;
    router.push({
      pathname: "/(tabs)/play/ai-game/session",
      params: {
        playerColor: settings.playerColor,
        skillLevel: settings.skillLevel.toString(),
        ...encodeStartParams(start.resolution.value),
      },
    });
  };

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded}
      startLabel={t("aiGame.setup.startGame")}
      onStart={handleStart}
      startDisabled={!start.resolution.ok}
    >
      <View style={styles.container}>
        <StartPositionForm
          mode={start.mode}
          onChangeMode={start.setMode}
          fenText={start.fenText}
          onChangeFenText={start.changeFenText}
          sideToMove={start.sideToMove}
          onChangeSideToMove={start.setSideToMove}
          pgnText={start.pgnText}
          onChangePgnText={start.changePgnText}
          resolution={start.resolution}
        />
        <SettingsForm
          playerColor={settings.playerColor}
          skillLevel={settings.skillLevel}
          playerColorHint={
            start.showDerivedFromPgnHint
              ? t("aiGame.setup.derivedFromPgn")
              : undefined
          }
          onUpdatePlayerColor={(playerColor) => {
            start.markColorManuallySet();
            updateSettings({ playerColor });
          }}
          onUpdateSkillLevel={(skillLevel) => updateSettings({ skillLevel })}
        />
      </View>
    </PracticeSetupScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
});
