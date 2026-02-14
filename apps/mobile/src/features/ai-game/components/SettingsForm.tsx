import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import type { Side } from "@blindfold-chess/types";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
} from "../../../theme";
import type { SkillLevel } from "../lib/types";

type SettingsFormProps = {
  playerColor: Side;
  skillLevel: SkillLevel;
  onUpdatePlayerColor: (color: Side) => void;
  onUpdateSkillLevel: (level: SkillLevel) => void;
};

const COLORS: Side[] = ["white", "black"];
const SKILL_LEVELS: SkillLevel[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
];

export function SettingsForm({
  playerColor,
  skillLevel,
  onUpdatePlayerColor,
  onUpdateSkillLevel,
}: SettingsFormProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Player Color */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.foreground }]}>
          {t("aiGame.setup.playerColor")}
        </Text>
        <View style={styles.optionsRow}>
          {COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              onPress={() => onUpdatePlayerColor(color)}
              style={[
                styles.colorButton,
                {
                  borderColor:
                    playerColor === color ? colors.primary : colors.border,
                  backgroundColor:
                    playerColor === color ? colors.primary : colors.card,
                },
              ]}
            >
              <Text
                style={[
                  styles.colorText,
                  {
                    color:
                      playerColor === color
                        ? colors.primaryForeground
                        : colors.foreground,
                    fontWeight:
                      playerColor === color
                        ? fontWeight.medium
                        : fontWeight.normal,
                  },
                ]}
              >
                {t(`aiGame.setup.${color}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Skill Level */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.foreground }]}>
          {t("aiGame.setup.skillLevel")}
        </Text>
        <Text style={[styles.sublabel, { color: colors.mutedForeground }]}>
          {t("aiGame.setup.skillLevelDescription")}
        </Text>
        <View style={styles.skillGrid}>
          {SKILL_LEVELS.map((level) => (
            <TouchableOpacity
              key={level}
              onPress={() => onUpdateSkillLevel(level)}
              style={[
                styles.skillButton,
                {
                  borderColor:
                    skillLevel === level ? colors.primary : colors.border,
                  backgroundColor:
                    skillLevel === level ? colors.primary : colors.card,
                },
              ]}
            >
              <Text
                style={[
                  styles.skillText,
                  {
                    color:
                      skillLevel === level
                        ? colors.primaryForeground
                        : colors.foreground,
                    fontWeight:
                      skillLevel === level
                        ? fontWeight.bold
                        : fontWeight.normal,
                  },
                ]}
              >
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
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
  sublabel: {
    fontSize: fontSize.sm,
  },
  optionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  colorButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  colorText: {
    fontSize: fontSize.md,
  },
  skillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  skillButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  skillText: {
    fontSize: fontSize.sm,
  },
});
