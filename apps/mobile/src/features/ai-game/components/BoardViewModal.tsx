import { Modal, Pressable, StyleSheet } from "react-native";
import type { Side } from "@blindfold-chess/types";
import { ChessBoard } from "./ChessBoard";
import { spacing } from "../../../theme";

type BoardViewModalProps = {
  visible: boolean;
  onClose: () => void;
  fen: string;
  playerColor: Side;
};

export function BoardViewModal({
  visible,
  onClose,
  fen,
  playerColor,
}: BoardViewModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.content}>
          <ChessBoard fen={fen} flipped={playerColor === "black"} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    width: "100%",
    paddingHorizontal: spacing.md,
  },
});
