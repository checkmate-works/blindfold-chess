import type { ComponentProps } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { ListIcon, ListRow, ListSection } from "../../components";
import { useTheme } from "../../theme";

/**
 * The one way a signed-out player is invited to sign in around something
 * an account would keep: a grouped row reading "Sign in / Create account",
 * what it gets you underneath, and a chevron — the shape of iOS Settings'
 * "Sign in to your iPhone" row. The whole row is the target, so it is easy
 * to hit and reads as something to open rather than as a sentence.
 *
 * Every such invitation (a challenge's setup and result, a puzzle's result,
 * a dojo exam) uses this component so it looks the same wherever it
 * appears; only the benefit line and the icon differ. It renders
 * unconditionally: the caller decides that the player is signed out.
 */
export function SignInRow({
  benefit,
  ionicon,
  testID,
}: {
  /** What an account gets the player here, under the row's title. */
  benefit: string;
  ionicon: ComponentProps<typeof ListIcon>["ionicon"];
  testID: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <ListSection>
      <ListRow
        leading={<ListIcon ionicon={ionicon} tint={colors.primary} />}
        title={t("settings.account.signIn")}
        subtitle={benefit}
        onPress={() => router.push("/sign-in")}
        testID={testID}
      />
    </ListSection>
  );
}
