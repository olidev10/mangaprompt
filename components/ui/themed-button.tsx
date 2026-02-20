import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type ThemedButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "solid" | "ghost";
  style?: ViewStyle;
};

export function ThemedButton({
  label,
  onPress,
  disabled = false,
  variant = "solid",
  style,
}: ThemedButtonProps) {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === "solid"
          ? {
              backgroundColor: palette.tint,
            }
          : {
              backgroundColor: "transparent",
              borderWidth: 1,
              borderColor: palette.border,
            },
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: variant === "solid" ? "#FFFFFF" : palette.text,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
});
