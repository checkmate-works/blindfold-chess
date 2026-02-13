import React, { useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Text,
} from "react-native";
import { useOnboardingChat } from "../features/onboarding/hooks/useOnboardingChat";
import { ChatBubble } from "../features/onboarding/components/ChatBubble";
import { ChoiceList } from "../features/onboarding/components/ChoiceList";
import { TypingIndicator } from "../features/onboarding/components/TypingIndicator";
import { useTheme } from "../theme";

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  const { messages, currentStep, isThinking, handleNext, handleChoice } =
    useOnboardingChat(onComplete);
  const scrollViewRef = useRef<ScrollView>(null);
  const { colors } = useTheme();

  // Auto-scroll to bottom of chat
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, isThinking]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
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

        <View
          style={[
            styles.inputArea,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
            },
          ]}
        >
          {!isThinking &&
            currentStep?.type === "question" &&
            currentStep.choices && (
              <ChoiceList
                choices={currentStep.choices.map((c) => ({
                  label: c.label,
                  onSelect: () => handleChoice(c.nextId, c.label),
                }))}
              />
            )}

          {!isThinking && currentStep?.type === "statement" && (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text
                style={[
                  styles.nextButtonText,
                  { color: colors.mutedForeground },
                ]}
              >
                Tap to continue
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
    padding: 16,
    borderTopWidth: 1,
    minHeight: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  nextButton: {
    width: "100%",
    padding: 16,
    alignItems: "center",
  },
  nextButtonText: {
    fontSize: 14,
  },
});
