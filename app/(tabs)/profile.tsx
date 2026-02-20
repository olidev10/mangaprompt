import { Alert, StyleSheet, Text, View } from "react-native";

import { ThemedButton } from "@/components/ui/themed-button";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export default function ProfileScreen() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const { session } = useAuth();

  const onSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Sign out failed", error.message);
    }
    // redirect to login handled by auth state change in useAuth
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={[styles.title, { color: palette.text }]}>Profile</Text>
      <Text style={[styles.label, { color: palette.muted }]}>Email</Text>
      <Text style={[styles.value, { color: palette.text }]}>
        {session?.user.email ?? "No email"}
      </Text>
      <ThemedButton label="Sign Out" onPress={onSignOut} />
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
});
