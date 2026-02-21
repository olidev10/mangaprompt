import { LogOut } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function ProfileScreen() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const { session, signOut } = useAuth();

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}> 
      <Text style={[styles.title, { color: palette.text }]}>Profile</Text>
      <Text style={[styles.label, { color: palette.muted }]}>Email</Text>
      <Text style={[styles.value, { color: palette.text }]}>
        {session?.user.email ?? "No email"}
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={signOut}
        style={({ pressed }) => [
          styles.signOut,
          { backgroundColor: palette.tint },
          pressed ? styles.pressed : null,
        ]}
      >
        <LogOut size={16} color="#FFFFFF" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    marginBottom: 12,
  },
  signOut: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  signOutText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.85,
  },
});
