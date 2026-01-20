import React from "react";
import { StyleSheet, View, TouchableOpacity, Text } from "react-native";

interface Choice {
  label: string;
  onSelect: () => void;
}

interface ChoiceListProps {
  choices: Choice[];
}

export const ChoiceList = ({ choices }: ChoiceListProps) => {
  return (
    <View style={styles.container}>
      {choices.map((choice, index) => (
        <TouchableOpacity
          key={index}
          style={styles.button}
          onPress={choice.onSelect}
        >
          <Text style={styles.text}>{choice.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    width: "100%",
  },
  button: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#007aff",
    alignItems: "center",
  },
  text: {
    fontSize: 16,
    color: "#007aff",
    fontWeight: "600",
  },
});
