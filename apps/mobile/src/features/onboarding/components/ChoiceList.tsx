import React from "react";
import { StyleSheet, View, TouchableOpacity, Text } from "react-native";
import { useTheme } from "../../../theme";

interface Choice {
  label: string;
  onSelect: () => void;
}

interface ChoiceListProps {
  choices: Choice[];
}

export const ChoiceList = ({ choices }: ChoiceListProps) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {choices.map((choice, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.button,
            {
              backgroundColor: colors.card,
              borderColor: colors.primary,
            },
          ]}
          onPress={choice.onSelect}
        >
          <Text style={[styles.text, { color: colors.primary }]}>
            {choice.label}
          </Text>
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
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
});
