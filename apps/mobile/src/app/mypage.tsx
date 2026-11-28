import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { refreshAccount, useAuth } from "../auth/use-auth";
import {
  Button,
  Card,
  ListIcon,
  ListRow,
  ListSection,
  TabScrollView,
} from "../components";
import { RecordCtaCard } from "../features/account/RecordCtaCard";
import {
  AccountStats,
  type AccountStatsInput,
} from "../features/records/AccountStats";
import { openWebPage } from "../lib/web-pages";
import { fontSize, fontWeight, spacing, useTheme } from "../theme";

/** The made-up stats of the sample a guest sees under the sign-up card. */
const PREVIEW_STATS: AccountStatsInput = {
  highestRank: "3kyu",
  level: 12,
  totalExp: 2480,
};

/**
 * Mypage, opened from the person icon at the right of the home header and
 * pushed on the root stack (the web's `/mypage`, in the mahjong app's
 * shape). It is a hub whose rows lead on — to My Records and from there to
 * a challenge — so it is a pushed page rather than a modal, and the back
 * button retraces the way.
 *
 * @description
 * - A player with an account and a username sees the heading — username,
 *   email, then dojo rank, level and EXP (`AccountStats`) — and rows into
 *   My Records (the web mypage's link of that name) and their own
 *   leaderboard ranks (the web home's "Your Rankings").
 * - A guest, or a player who has not chosen a username yet, sees the same
 *   sign-up card as the home tab (`RecordCtaCard`, worded for mypage) with a
 *   faded sample of the heading under it: what would be listed here is
 *   clearer as a picture than as a list of words. The sample takes no taps
 *   and is hidden from screen readers.
 * - Settings is a row at the end for everyone. It used to be the gear in the
 *   home header; the header now has one entry, here, as in the mahjong app.
 *   Sign-in and sign-up open in the account modal over this page and close
 *   back onto it.
 *
 * There is no profile editing: avatars, display names and bios are shown to
 * other players on the web, and the app shows no other player (see
 * apps/mobile/CLAUDE.md), so the app takes only the username. The last
 * row opens the player's public profile (`/u/<username>`) in the browser
 * instead, where the web's profile, with its posts and followers, lives.
 *
 * @flow
 * 1. The records row opens My Records; the ranks row the user's rank per
 *    challenge
 * 2. A guest signs up or signs in from the card; a player without a username
 *    goes on to choose one
 * 3. The settings row opens settings
 */
export default function MypageScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <TabScrollView contentContainerStyle={styles.content}>
      <MypageBody />
      <ListSection>
        <ListRow
          leading={<ListIcon ionicon="settings-outline" />}
          title={t("tabs.settings")}
          onPress={() => router.push("/settings")}
          testID="mypage-settings"
        />
      </ListSection>
    </TabScrollView>
  );
}

function MypageBody() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { status, account, accountError, email } = useAuth();

  // A build without accounts has nothing to show above settings.
  if (status === "unavailable") return null;
  if (status === "loading") return <ActivityIndicator />;
  if (status === "signedIn" && account === undefined) {
    return accountError ? (
      <LoadFailed onRetry={() => void refreshAccount()} />
    ) : (
      <ActivityIndicator />
    );
  }
  if (status === "signedOut" || account?.username === null) {
    return (
      <>
        <RecordCtaCard placement="mypage" />
        <View
          style={styles.preview}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID="mypage-preview"
        >
          <ProfileHeading
            username={t("mypage.preview.username")}
            stats={PREVIEW_STATS}
          />
        </View>
      </>
    );
  }
  if (!account) return null;

  return (
    <>
      <ProfileHeading
        username={account.username ?? ""}
        email={email}
        stats={account}
      />
      <ListSection>
        <ListRow
          leading={<ListIcon ionicon="trophy-outline" />}
          title={t("records.title")}
          onPress={() => router.push("/records")}
          testID="mypage-records"
        />
        <ListRow
          leading={<ListIcon ionicon="podium-outline" />}
          title={t("ownRanks.title")}
          onPress={() => router.push("/ranks")}
          testID="mypage-ranks"
        />
        {!!account.username && (
          <ListRow
            leading={<ListIcon ionicon="person-circle-outline" />}
            title={t("mypage.webProfile")}
            accessory="external"
            onPress={() =>
              openWebPage(
                `/u/${encodeURIComponent(account.username ?? "")}`,
                i18n.language,
              )
            }
            testID="mypage-web-profile"
          />
        )}
      </ListSection>
    </>
  );
}

/** The heading card: the username over the account's stats. */
function ProfileHeading({
  username,
  email,
  stats,
}: {
  username: string;
  email?: string;
  stats: AccountStatsInput;
}) {
  const { colors } = useTheme();
  return (
    <Card style={styles.heading}>
      <View style={styles.names}>
        <Text
          style={[styles.username, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {username}
        </Text>
        {email ? (
          <Text
            style={[styles.email, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {email}
          </Text>
        ) : null}
      </View>
      <AccountStats account={stats} />
    </Card>
  );
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.failed}>
      <Text style={{ color: colors.destructive }}>
        {t("mypage.loadFailed")}
      </Text>
      <Button
        title={t("mypage.retry")}
        variant="ghost"
        size="sm"
        onPress={onRetry}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  heading: {
    gap: spacing.md,
  },
  names: {
    gap: 2,
  },
  username: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  email: {
    fontSize: fontSize.sm,
  },
  // Same layout as the real heading, faded so it reads as a sample.
  preview: {
    opacity: 0.4,
  },
  failed: {
    alignItems: "center",
    gap: spacing.xs,
  },
});
