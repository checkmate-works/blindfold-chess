import { StyleSheet, View } from "react-native";
import { Button } from "../../../components/Button";
import { spacing } from "../../../theme";

interface Choice {
  label: string;
  onSelect: () => void;
}

interface ChoiceListProps {
  choices: Choice[];
}

export const ChoiceList = ({ choices }: ChoiceListProps) => (
  <View style={styles.container}>
    {choices.map((choice, index) => (
      <Button
        key={index}
        title={choice.label}
        onPress={choice.onSelect}
        variant="outline"
        size="lg"
        fullWidth
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: 12,
    width: "100%",
  },
});
