import React, { useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  type ScrollViewInstance,
  TouchableOpacity,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomBar } from "../components";
import { useTranslation } from "react-i18next";
import { useOnboardingChat } from "../features/onboarding/hooks/useOnboardingChat";
import { ChatBubble } from "../features/onboarding/components/ChatBubble";
import { ChoiceList } from "../features/onboarding/components/ChoiceList";
import { TypingIndicator } from "../features/onboarding/components/TypingIndicator";
import type { OnboardingDestination } from "../features/onboarding/data/script";
import { useTheme } from "../theme";

interface OnboardingScreenProps {
  /** `null` when the player skipped; otherwise where the chat sends them. */
  onComplete: (destination: OnboardingDestination | null) => void;
}

/**
 * The first-launch chat with the mentor: a short introduction, one question
 * about how confident the player is, then a button into the first game or
 * practice it picked. Skippable from the top right.
 */
export const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  const { messages, isThinking, waitingFor, handleChoice } =
    useOnboardingChat();
  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const hasBar =
    waitingFor?.type === "question" || waitingFor?.type === "finish";

  // Auto-scroll to bottom of chat
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, isThinking]);

  return (
    <View
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.page,
          paddingTop: insets.top,
          // The answer bar pads the home indicator itself (BottomBar);
          // while the mentor is still talking there is no bar to do it.
          paddingBottom: hasBar ? 0 : insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => onComplete(null)}
          style={styles.skipButton}
        >
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
            {t("onboarding.skip")}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
        >
          {messages.map((msg) => (
            <ChatBubble key={msg.id} text={msg.text} isSystem={msg.isSystem} />
          ))}
          {isThinking && <TypingIndicator />}
        </ScrollView>

        {waitingFor?.type === "question" && (
          <BottomBar style={styles.inputArea}>
            <ChoiceList
              choices={waitingFor.choices.map((c) => ({
                label: t(c.labelKey),
                onSelect: () => handleChoice(c.nextId, t(c.labelKey)),
              }))}
            />
          </BottomBar>
        )}

        {waitingFor?.type === "finish" && (
          <BottomBar style={styles.inputArea}>
            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: colors.primary }]}
              onPress={() => onComplete(waitingFor.destination)}
            >
              <Text
                style={[
                  styles.ctaButtonText,
                  { color: colors.primaryForeground },
                ]}
              >
                {t(waitingFor.ctaKey)}
              </Text>
            </TouchableOpacity>
          </BottomBar>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipButton: {
    padding: 4,
  },
  skipText: {
    fontSize: 15,
  },
  container: {
    flex: 1,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 20,
  },
  inputArea: {
    minHeight: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  ctaButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: "center",
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
