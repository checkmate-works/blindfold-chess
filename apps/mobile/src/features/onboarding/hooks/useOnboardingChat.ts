import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ONBOARDING_SCRIPT,
  ONBOARDING_START_ID,
  type ScriptStep,
} from "../data/script";

export type ChatMessage = {
  id: string;
  text: string;
  isSystem: boolean;
};

/**
 * How long the typing indicator shows before each of the mentor's lines.
 * Long enough to read as someone typing, short enough that the opening
 * lines, which play on their own, do not keep the player waiting.
 */
export const MENTOR_TYPING_MS = 700;

/**
 * Plays the onboarding script as a chat. Statements follow each other on
 * their own; the player acts only on a question (a choice) and on the
 * finish step (its button, through the screen). `waitingFor` says which of
 * the two the screen should offer, and is `null` while the mentor is typing.
 */
export const useOnboardingChat = () => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStepId, setCurrentStepId] = useState(ONBOARDING_START_ID);
  const [isThinking, setIsThinking] = useState(true);

  const currentStep: ScriptStep | undefined = ONBOARDING_SCRIPT[currentStepId];

  useEffect(() => {
    if (!currentStep) return;

    setIsThinking(true);
    const timer = setTimeout(() => {
      // Messages are append-only, so `prev.length` is a collision-free id.
      // (Date.now() was not: a user bubble and the system reply produced in
      // the same millisecond shared a React key.)
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${prev.length}`,
          text: t(currentStep.textKey),
          isSystem: true,
        },
      ]);
      if (currentStep.type === "statement") {
        setCurrentStepId(currentStep.nextId);
      } else {
        setIsThinking(false);
      }
    }, MENTOR_TYPING_MS);

    return () => clearTimeout(timer);
  }, [currentStep, t]);

  const handleChoice = useCallback((nextId: string, label: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `msg-${prev.length}`, text: label, isSystem: false },
    ]);
    setCurrentStepId(nextId);
  }, []);

  const waitingFor =
    isThinking || !currentStep || currentStep.type === "statement"
      ? null
      : currentStep;

  return { messages, isThinking, waitingFor, handleChoice };
};
