import React from "react";
import { StyleSheet, Text, View, Image } from "react-native";
import { MENTOR } from "../constants/mentor";
import { useTheme } from "../../../theme";

interface ChatBubbleProps {
  text: string;
  isSystem: boolean;
}

export const ChatBubble = ({ text, isSystem }: ChatBubbleProps) => {
  const { colors } = useTheme();

  if (isSystem) {
    return (
      <View style={styles.systemRow}>
        <View style={styles.avatarContainer}>
          <Image
            source={MENTOR.avatar}
            style={[styles.avatar, { backgroundColor: colors.muted }]}
          />
        </View>
        <View style={styles.systemBubbleContainer}>
          <Text style={[styles.mentorName, { color: colors.mutedForeground }]}>
            {MENTOR.name}
          </Text>
          <View
            style={[styles.systemBubble, { backgroundColor: colors.secondary }]}
          >
            <Text style={[styles.systemText, { color: colors.foreground }]}>
              {text}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.userRow}>
      <View style={[styles.userBubble, { backgroundColor: colors.primary }]}>
        <Text style={[styles.userText, { color: colors.primaryForeground }]}>
          {text}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  systemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 8,
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  systemBubbleContainer: {
    flex: 1,
    maxWidth: "80%",
  },
  mentorName: {
    fontSize: 12,
    marginBottom: 4,
    marginLeft: 4,
  },
  systemBubble: {
    padding: 12,
    borderRadius: 16,
    borderTopLeftRadius: 4,
  },
  systemText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginVertical: 8,
  },
  userBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  userText: {
    fontSize: 16,
    lineHeight: 22,
  },
});
