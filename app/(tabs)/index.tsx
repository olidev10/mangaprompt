import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/hooks/useAuth";

export default function HomeScreen() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const { session } = useAuth();

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={[styles.title, { color: palette.text }]}>Home</Text>
      <Text style={[styles.subtitle, { color: palette.muted }]}> 
        You are signed in as {session?.user.email ?? "unknown user"}.
      </Text>
      <Text style={[styles.body, { color: palette.muted }]}> 
        Replace this screen with your app content.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
    gap: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 16,
  },
  body: {
    fontSize: 14,
  },
});
