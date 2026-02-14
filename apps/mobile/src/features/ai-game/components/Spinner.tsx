import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { SpinnerIcon } from "@blindfold-chess/icons";

type SpinnerProps = {
  color: string;
  size?: number;
};

export function Spinner({ color, size = 16 }: SpinnerProps) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <SpinnerIcon size={size} color={color} />
    </Animated.View>
  );
}
