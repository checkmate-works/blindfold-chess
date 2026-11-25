import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { BottomSheet } from "../../components/BottomSheet";
import { Button } from "../../components/Button";
import { useTheme, fontSize, fontWeight, spacing } from "../../theme";

type Props = {
  /** The module's i18n key (`MOBILE_PRACTICE_MODULES[].i18nKey`). */
  moduleKey: string;
  /** The pages to show, in order: `helpPagesFor`. */
  pages: readonly string[];
  visible: boolean;
  onClose: () => void;
};

/**
 * A module's help, one page at a time in a bottom sheet: how to play (unless
 * the setup screen shows it) and the web tutorial's explanation steps. The
 * texts are the web's (copied by `scripts/port-help-texts.py`); the web
 * shows them as a spotlight tour on the module page and a separate tutorial
 * page, neither of which has a native counterpart, so both become pages of
 * this sheet.
 */
export function HelpSheet({ moduleKey, pages, visible, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (visible) setIndex(0);
  }, [visible]);

  if (pages.length === 0) return null;
  const page = pages[Math.min(index, pages.length - 1)];
  const isLast = index >= pages.length - 1;

  // moduleHelp.<moduleKey>.<page>.title / .body: generated keys, see scripts/port-help-texts.py
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("common.help")}
      footer={
        <View style={styles.footer}>
          {pages.length > 1 && (
            <View style={styles.dots}>
              {pages.map((name, i) => (
                <View
                  key={name}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        i === index ? colors.primary : colors.border,
                    },
                  ]}
                />
              ))}
            </View>
          )}
          <View style={styles.buttons}>
            {index > 0 && (
              <Button
                title={t("common.previous")}
                variant="outline"
                onPress={() => setIndex((i) => i - 1)}
                style={styles.button}
              />
            )}
            <Button
              title={isLast ? t("common.close") : t("common.next")}
              onPress={isLast ? onClose : () => setIndex((i) => i + 1)}
              style={styles.button}
            />
          </View>
        </View>
      }
    >
      <Text style={[styles.title, { color: colors.foreground }]}>
        {t(`moduleHelp.${moduleKey}.${page}.title`)}
      </Text>
      <Text style={[styles.body, { color: colors.foreground }]}>
        {t(`moduleHelp.${moduleKey}.${page}.body`)}
      </Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: fontSize.md,
    lineHeight: 24,
  },
  footer: {
    gap: spacing.md,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  buttons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  button: {
    flex: 1,
  },
});
