import { ReactNode, useEffect, useRef } from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";

const STAGGER_MS = 56;

type Props = {
  index?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Larger motion for hero blocks */
  variant?: "section" | "hero" | "card";
};

/** Fade-up section — RN Animated (Expo Go safe, no Reanimated native runtime). */
export function StaggerSection({ index = 0, children, style, variant = "section" }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(variant === "hero" ? 20 : variant === "card" ? 10 : 14)).current;
  const scale = useRef(new Animated.Value(variant === "card" ? 0.96 : 1)).current;

  useEffect(() => {
    const delay = index * STAGGER_MS + (variant === "hero" ? 0 : 0);
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: variant === "hero" ? 520 : 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        friction: variant === "hero" ? 9 : 8,
        tension: variant === "card" ? 80 : 68,
        useNativeDriver: true,
      }),
      ...(variant === "card"
        ? [
            Animated.spring(scale, {
              toValue: 1,
              delay,
              friction: 8,
              tension: 90,
              useNativeDriver: true,
            }),
          ]
        : []),
    ]);
    anim.start();
    return () => anim.stop();
  }, [index, opacity, translateY, scale, variant]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }, { scale }] }, style]}>
      {children}
    </Animated.View>
  );
}
