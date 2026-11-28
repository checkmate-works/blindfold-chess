import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";

import { refreshAccount } from "../../auth/use-auth";
import { useTheme } from "../../theme";
import { pickAndUploadAvatar, removeAvatar } from "./avatar";

const SIZE = 64;

/** Server and client error codes → `mypage.avatar.errors.*`. */
const ERROR_KEYS: Record<string, string> = {
  offline: "offline",
  rateLimited: "rateLimited",
  file_too_large: "tooLarge",
  invalid_file_type: "invalidFile",
  banned: "banned",
};

/**
 * The account's avatar at the head of mypage, and the way to change it: a
 * tap offers choosing a photo, and removing the current one when there is
 * one. The photo is the user's own and is shown only to them in the app;
 * other players see it on the web, where reporting and blocking live (see
 * "The app shows no other user" in apps/mobile/CLAUDE.md).
 *
 * `avatarUrl` is the account's; a change is saved straight away and the
 * account re-read, so the picture shown is always the stored one.
 */
export function AvatarPicker({
  avatarUrl,
}: {
  avatarUrl: string | null | undefined;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);

  const showError = (code: string) => {
    // mypage.avatar.errors.{offline,rateLimited,tooLarge,invalidFile,banned,generic}
    Alert.alert(t(`mypage.avatar.errors.${ERROR_KEYS[code] ?? "generic"}`));
  };

  const run = async (action: () => Promise<string | null>) => {
    setBusy(true);
    try {
      const code = await action();
      if (code === null) await refreshAccount();
      else if (code !== "cancelled") showError(code);
    } catch {
      // The picker or the re-encode failed on the device (an unreadable
      // photo, an iCloud original that would not download).
      showError("invalid_file_type");
    } finally {
      setBusy(false);
    }
  };

  const choose = () =>
    void run(async () => {
      const result = await pickAndUploadAvatar();
      return "error" in result ? result.error : null;
    });

  const remove = () => void run(removeAvatar);

  const handlePress = () => {
    if (busy) return;
    if (!avatarUrl) {
      choose();
      return;
    }
    Alert.alert(t("mypage.avatar.title"), undefined, [
      { text: t("mypage.avatar.choose"), onPress: choose },
      {
        text: t("mypage.avatar.remove"),
        style: "destructive",
        onPress: () =>
          Alert.alert(t("mypage.avatar.removeConfirm"), undefined, [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("mypage.avatar.remove"),
              style: "destructive",
              onPress: remove,
            },
          ]),
      },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={t(
        avatarUrl ? "mypage.avatar.change" : "mypage.avatar.add",
      )}
      accessibilityState={{ busy }}
      testID="mypage-avatar"
    >
      {({ pressed }) => (
        <View
          style={[
            styles.circle,
            { backgroundColor: pressed ? colors.muted : colors.background },
          ]}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.image} />
          ) : (
            <Ionicons
              name="person"
              size={SIZE * 0.55}
              color={colors.mutedForeground}
            />
          )}
          {busy ? (
            <View style={[styles.overlay, { backgroundColor: colors.page }]}>
              <ActivityIndicator />
            </View>
          ) : (
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.primary, borderColor: colors.page },
              ]}
            >
              <Ionicons
                name={avatarUrl ? "pencil" : "add"}
                size={12}
                color={colors.primaryForeground}
              />
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.7,
  },
  badge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
