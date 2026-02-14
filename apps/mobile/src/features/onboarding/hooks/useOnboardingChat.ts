import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ONBOARDING_SCRIPT } from "../data/script";

export type ChatMessage = {
  id: string;
  text: string;
  isSystem: boolean;
};

export const useOnboardingChat = (onComplete: () => void) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStepId, setCurrentStepId] = useState<string>("start");
  const [isThinking, setIsThinking] = useState(false);

  const currentStep = ONBOARDING_SCRIPT[currentStepId];

  // Add the current step's message to the chat
  useEffect(() => {
    if (!currentStep) return;

    setIsThinking(true);
    const timer = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: t(currentStep.textKey),
          isSystem: true,
        },
      ]);
      setIsThinking(false);
    }, 600); // Simulated delay

    return () => clearTimeout(timer);
  }, [currentStepId, currentStep, t]);

  const handleNext = useCallback(() => {
    if (!currentStep) return;

    if (currentStep.type === "statement") {
      if (currentStep.id === "end") {
        onComplete();
      } else if (currentStep.nextId) {
        setCurrentStepId(currentStep.nextId);
      }
    }
  }, [currentStep, onComplete]);

  const handleChoice = useCallback((nextId: string, label: string) => {
    // Add user response bubble
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), text: label, isSystem: false },
    ]);

    // Move to next step
    setCurrentStepId(nextId);
  }, []);

  return {
    messages,
    currentStep,
    isThinking,
    handleNext,
    handleChoice,
  };
};
