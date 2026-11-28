import { Platform, StyleSheet, View } from "react-native";

import { useTheme } from "../theme";

/**
 * The short bar at the top centre of a card-style modal (the account
 * modal), telling the user it can be dragged down to close.
 *
 * @description
 * The iOS card modal (`presentation: "modal"`) already closes on a drag
 * down, but without a grabber the × in its header read as the only way out.
 * The app's half-modals show the OS's grabber, and this makes the card
 * modal look the same.
 *
 * It is drawn here because the OS's grabber cannot be turned on for it:
 * react-native-screens applies `sheetGrabberVisible` only to `formSheet`,
 * and moving the account stack to a form sheet would also turn it into a
 * Material bottom sheet without a navigation bar on Android. The size and
 * position are the system grabber's (36 × 5 pt, 5 pt from the top edge).
 *
 * Android's modal is a full-screen page with no drag to close, so nothing
 * is drawn there. The bar takes no touches, so it never sits in front of
 * the header's ×.
 */
export function ModalGrabber() {
  const { colors } = useTheme();
  if (Platform.OS !== "ios") return null;
  return (
    <View pointerEvents="none" style={styles.container}>
      <View style={[styles.bar, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 5,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  bar: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
});
