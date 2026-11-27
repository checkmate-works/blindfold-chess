import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { ListIcon, ListRow, ListSection } from "../../components";
import { useOnboardingStatus } from "../../hooks/useOnboardingStatus";

/**
 * The way back into the introduction (the mentor's chat, `/onboarding`),
 * which the home tab no longer lists. Replaying it plays the chat again
 * without touching the stored "onboarding done" flag; a development build
 * also gets a row that clears the flag, so the first-launch redirect and
 * the account offer after the first session can be checked again.
 */
export function TutorialSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const { clearStatus } = useOnboardingStatus();

  return (
    <ListSection title={t("settings.tutorial.title")}>
      <ListRow
        leading={<ListIcon ionicon="chatbubbles-outline" />}
        title={t("settings.tutorial.replay")}
        onPress={() => router.push("/onboarding")}
        testID="settings-replay-onboarding"
      />
      {__DEV__ ? (
        <ListRow
          leading={<ListIcon ionicon="refresh-outline" />}
          title="Reset Onboarding (Debug)"
          onPress={async () => {
            await clearStatus();
            router.replace("/onboarding");
          }}
        />
      ) : null}
    </ListSection>
  );
}
