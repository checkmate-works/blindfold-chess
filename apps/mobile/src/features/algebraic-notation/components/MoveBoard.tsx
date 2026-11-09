import { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";

import { ChessBoard } from "../../ai-game/components";

type MoveBoardProps = {
  fenBefore: string;
  fenAfter: string;
};

/** How long the "before" position stays up before the move is shown. */
const MOVE_DELAY_MS = 800;

/**
 * Shows the position before the move, then switches to the position after
 * it, so the player sees which piece went where.
 *
 * The web animates the piece sliding across the board; this is the cheaper
 * mobile stand-in, a cut from one position to the next. The parent remounts
 * it per question (`key`), which restarts the delay.
 */
export function MoveBoard({ fenBefore, fenAfter }: MoveBoardProps) {
  const [showAfter, setShowAfter] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowAfter(true), MOVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <ChessBoard fen={showAfter ? fenAfter : fenBefore} showCoordinates />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
});
