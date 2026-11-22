import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { spacing } from "../theme";
import { SessionCloseButton } from "./SessionCloseButton";

type Props = {
  /** Shown at the trailing edge (a clock, a progress label). */
  children?: ReactNode;
  /** Ask before leaving; see `SessionCloseButton`. Defaults to true. */
  confirm?: boolean;
};

/**
 * The top row of a header-less session screen: the × that leaves the
 * session modal, and whatever the screen shows opposite it. For the screens
 * that do not render inside `PracticeSessionScreen` (which has this row
 * built in).
 */
export function SessionTopBar({ children, confirm = true }: Props) {
  return (
    <View style={styles.row}>
      <SessionCloseButton confirm={confirm} />
      <View style={styles.trailing}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    minHeight: 44,
  },
  trailing: {
    flex: 1,
    alignItems: "flex-end",
  },
});
