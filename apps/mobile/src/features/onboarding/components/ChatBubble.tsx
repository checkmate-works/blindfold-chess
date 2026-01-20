import React from "react";
import { StyleSheet, Text, View, Image } from "react-native";
import { MENTOR } from "../constants/mentor";

interface ChatBubbleProps {
  text: string;
  isSystem: boolean;
}

export const ChatBubble = ({ text, isSystem }: ChatBubbleProps) => {
  if (isSystem) {
    return (
      <View style={styles.systemRow}>
        <View style={styles.avatarContainer}>
          <Image source={MENTOR.avatar} style={styles.avatar} />
        </View>
        <View style={styles.systemBubbleContainer}>
          <Text style={styles.mentorName}>{MENTOR.name}</Text>
          <View style={styles.systemBubble}>
            <Text style={styles.systemText}>{text}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.userRow}>
      <View style={styles.userBubble}>
        <Text style={styles.userText}>{text}</Text>
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
    backgroundColor: "#f0f0f0",
  },
  systemBubbleContainer: {
    flex: 1,
    maxWidth: "80%",
  },
  mentorName: {
    fontSize: 12,
    color: "#8e8e93",
    marginBottom: 4,
    marginLeft: 4,
  },
  systemBubble: {
    backgroundColor: "#e5e5ea",
    padding: 12,
    borderRadius: 16,
    borderTopLeftRadius: 4,
  },
  systemText: {
    fontSize: 16,
    lineHeight: 22,
    color: "#000",
  },
  userRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginVertical: 8,
  },
  userBubble: {
    maxWidth: "80%",
    backgroundColor: "#007aff",
    padding: 12,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  userText: {
    fontSize: 16,
    lineHeight: 22,
    color: "#fff",
  },
});
