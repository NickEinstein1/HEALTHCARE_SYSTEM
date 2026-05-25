import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { colors } from "../../theme/colors";

type Props = { icon: string; focused: boolean };

export function AnimatedTabIcon({ icon, focused }: Props) {
  const scale = useRef(new Animated.Value(focused ? 1 : 0.92)).current;
  const opacity = useRef(new Animated.Value(focused ? 1 : 0.55)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: focused ? 1 : 0.92, friction: 8, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: focused ? 1 : 0.55, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [focused, scale, opacity]);

  return (
    <View style={{ alignItems: "center", gap: 2 }}>
      <Animated.View
        style={{
          width: 36,
          height: 32,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: focused ? colors.gl : "transparent",
          borderWidth: focused ? 1 : 0,
          borderColor: colors.gm,
          opacity,
          transform: [{ scale }],
        }}
      >
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </Animated.View>
    </View>
  );
}
