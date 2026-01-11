import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_KEY = "HAS_COMPLETED_ONBOARDING";

export const useOnboardingStatus = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const value = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (value !== null) {
          setHasCompleted(true);
        }
      } catch (e) {
        console.error("Failed to load onboarding status", e);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  const setCompleted = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
      setHasCompleted(true);
    } catch (e) {
      console.error("Failed to save onboarding status", e);
    }
  };

  const clearStatus = async () => {
    try {
      await AsyncStorage.removeItem(ONBOARDING_KEY);
      setHasCompleted(false);
    } catch (e) {
      console.error("Failed to clear onboarding status", e);
    }
  };

  return { isLoading, hasCompleted, setCompleted, clearStatus };
};
