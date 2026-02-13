import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Image, Animated, Easing } from "react-native";
import { MENTOR } from "../constants/mentor";
import { useTheme } from "../../../theme";

export const TypingIndicator = () => {
  const { colors } = useTheme();
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ]),
      );
    };

    const anim1 = animateDot(dot1, 0);
    const anim2 = animateDot(dot2, 150);
    const anim3 = animateDot(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  const translateY = (anim: Animated.Value) =>
    anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -4],
    });

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <Image
          source={MENTOR.avatar}
          style={[styles.avatar, { backgroundColor: colors.muted }]}
        />
      </View>
      <View style={[styles.bubble, { backgroundColor: colors.secondary }]}>
        <Animated.View
          style={[
            styles.dot,
            { backgroundColor: colors.mutedForeground },
            { transform: [{ translateY: translateY(dot1) }] },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            { backgroundColor: colors.mutedForeground },
            { transform: [{ translateY: translateY(dot2) }] },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            { backgroundColor: colors.mutedForeground },
            { transform: [{ translateY: translateY(dot3) }] },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 8,
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
