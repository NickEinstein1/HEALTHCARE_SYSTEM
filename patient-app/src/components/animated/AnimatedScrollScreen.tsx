import { Children, ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, ViewStyle } from "react-native";
import { StaggerSection } from "./StaggerSection";
import { colors } from "../../theme/colors";

type Props = {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentContainerStyle?: ViewStyle;
  backgroundColor?: string;
  padBottom?: number;
};

export function AnimatedScrollScreen({
  children,
  refreshing,
  onRefresh,
  contentContainerStyle,
  backgroundColor = colors.bg,
  padBottom = 32,
}: Props) {
  const sections = Children.toArray(children).filter(Boolean);

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor }]}
      contentContainerStyle={[styles.content, { paddingBottom: padBottom }, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.g} colors={[colors.g]} />
        ) : undefined
      }
    >
      {sections.map((section, index) => (
        <StaggerSection key={index} index={index}>
          {section}
        </StaggerSection>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 4 },
});
