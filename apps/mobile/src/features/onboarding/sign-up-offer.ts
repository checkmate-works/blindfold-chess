import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * The AsyncStorage flag that asks the home tab to offer an account once:
 * set when onboarding sends the player into their first game or practice,
 * consumed the next time the home tab is shown.
 */
const KEY = "PENDING_SIGN_UP_OFFER";

/** Storage errors are logged and swallowed: the offer is a nicety. */
export async function armSignUpOffer(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, "true");
  } catch (e) {
    console.error("Failed to save the sign-up offer flag", e);
  }
}

/**
 * Whether an offer is pending, clearing it in the same call so it is made
 * once whatever the caller then decides.
 */
export async function takeSignUpOffer(): Promise<boolean> {
  try {
    const pending = (await AsyncStorage.getItem(KEY)) !== null;
    if (pending) await AsyncStorage.removeItem(KEY);
    return pending;
  } catch (e) {
    console.error("Failed to read the sign-up offer flag", e);
    return false;
  }
}

/** Whether an offer is pending, leaving it in place. */
export async function hasSignUpOffer(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) !== null;
  } catch {
    return false;
  }
}
