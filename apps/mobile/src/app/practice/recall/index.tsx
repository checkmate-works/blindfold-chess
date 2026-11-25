import { useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import {
  ListIcon,
  ListRow,
  ListSection,
  PracticeSetupScreen,
} from "../../../components";
import { ColorSelector } from "../../../features/recall/components/ColorSelector";
import { PgnField } from "../../../features/recall/components/PgnField";
import {
  defaultSideFor,
  readRecallPgn,
} from "../../../features/recall/lib/pgn";
import {
  SAMPLE_PGN,
  useRecallSettings,
} from "../../../features/recall/settings";
import { fontSize, spacing, useTheme } from "../../../theme";

/**
 * Recall setup (the web's `/practice/recall`): the PGN to replay and the
 * side to recall, then Start. The web's sections — the PGN box under its
 * heading, the colour picker under "Select Your Color" — are grouped
 * panels here.
 *
 * As on the web, a newly pasted PGN picks the side to move after its last
 * move until the player picks a side themselves, and Start stays off while
 * the PGN does not read. The web's other PGN sources (a Lichess URL, the
 * site's saved games) are not offered; the sample game stands in for
 * trying it without a PGN at hand. "Auto-fill opponent's moves" is a
 * switch in the session, as on the web, rather than a setting here.
 */
export default function RecallSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { settings, isLoaded, updateSettings } = useRecallSettings();
  // The web re-derives the side only until it is picked by hand, for this
  // visit; a side kept from an earlier visit is not overridden on load.
  const sidePicked = useRef(false);

  const game = readRecallPgn(settings.pgn);
  const invalid = settings.pgn.trim() !== "" && game === null;

  const changePgn = (pgn: string) => {
    const next = readRecallPgn(pgn);
    updateSettings(
      next && !sidePicked.current
        ? { pgn, playerColor: defaultSideFor(next) }
        : { pgn },
    );
  };

  const handleStart = () => {
    if (!game) return;
    router.push({
      pathname: "/practice/recall/session",
      params: { pgn: settings.pgn, color: settings.playerColor, from: "setup" },
    });
  };

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded}
      onStart={handleStart}
      startDisabled={game === null}
    >
      <ListSection title={t("recall.setup.pgnLabel")}>
        <View style={styles.panelBody}>
          <PgnField
            value={settings.pgn}
            onChange={changePgn}
            valid={game !== null}
            invalid={invalid}
          />
          {invalid && (
            <Text style={[styles.error, { color: colors.destructive }]}>
              {t("recall.setup.invalidPgn")}
            </Text>
          )}
        </View>
        <ListRow
          title={t("recall.setup.useSample")}
          leading={<ListIcon ionicon="document-text-outline" />}
          onPress={() => changePgn(SAMPLE_PGN)}
          testID="recall-use-sample"
        />
      </ListSection>

      <ListSection title={t("recall.setup.color.title")}>
        <View style={styles.panelBody}>
          <ColorSelector
            value={settings.playerColor}
            onChange={(playerColor) => {
              sidePicked.current = true;
              updateSettings({ playerColor });
            }}
          />
        </View>
      </ListSection>
    </PracticeSetupScreen>
  );
}

const styles = StyleSheet.create({
  panelBody: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  error: {
    fontSize: fontSize.sm,
  },
});
