import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";

import { ThemedButton } from "@/components/ui/themed-button";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);

  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        Alert.alert(
          "Check your inbox",
          "If email confirmation is enabled, verify your email before logging in.",
        );
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to authenticate right now.";
      Alert.alert("Authentication error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <View
        style={[
          styles.card,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Text style={[styles.title, { color: palette.text }]}>
          Expo + Supabase Starter
        </Text>
        <Text style={[styles.subtitle, { color: palette.muted }]}>
          {mode === "login"
            ? "Sign in to continue."
            : "Create an account to get started."}
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: palette.muted }]}>Email</Text>
          <TextInput
            placeholder="email@example.com"
            placeholderTextColor={palette.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={[
              styles.input,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: palette.muted }]}>Password</Text>
          <TextInput
            placeholder="••••••••"
            placeholderTextColor={palette.muted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={[
              styles.input,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
          />
        </View>

        <ThemedButton
          label={
            loading
              ? "Please wait..."
              : mode === "login"
                ? "Log In"
                : "Create Account"
          }
          onPress={onSubmit}
          disabled={loading}
        />

        <ThemedButton
          label={
            mode === "login"
              ? "Need an account? Sign up"
              : "Have an account? Log in"
          }
          variant="ghost"
          onPress={() => setMode(mode === "login" ? "signup" : "login")}
          disabled={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
});
