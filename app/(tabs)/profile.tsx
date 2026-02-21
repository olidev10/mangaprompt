import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { ChevronRight, LogOut, Wallet } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";

export default function ProfileScreen() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const router = useRouter();
  const { session, signOut } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(true);

  const loadCredits = useCallback(async () => {
    if (!session?.user.id) {
      setCredits(null);
      setLoadingCredits(false);
      return;
    }

    setLoadingCredits(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    setCredits(data?.credits ?? 0);
    setLoadingCredits(false);
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      loadCredits().catch((error) => {
        setLoadingCredits(false);
        const message =
          error instanceof Error ? error.message : "Failed to load credits.";
        Alert.alert("Profile", message);
      });
    }, [loadCredits]),
  );

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}> 
      <Text style={[styles.pageTitle, { color: palette.text }]}>Profile</Text>

      <View
        style={[
          styles.card,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Text style={[styles.sectionLabel, { color: palette.muted }]}>Account</Text>
        <Text style={[styles.email, { color: palette.text }]} numberOfLines={1}>
          {session?.user.email ?? "No email"}
        </Text>

        <View
          style={[
            styles.creditsCard,
            { backgroundColor: palette.card, borderColor: palette.border },
          ]}
        >
          <View style={styles.creditsHeader}>
            <Wallet size={16} color={palette.tint} />
            <Text style={[styles.creditsLabel, { color: palette.muted }]}>Credits</Text>
          </View>

          {loadingCredits ? (
            <ActivityIndicator color={palette.tint} style={styles.creditsLoader} />
          ) : (
            <Text style={[styles.creditsValue, { color: palette.text }]}>
              {credits ?? 0}
            </Text>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(tabs)/shop" as never)}
          style={({ pressed }) => [
            styles.shopButton,
            { borderColor: palette.border, backgroundColor: palette.card },
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={[styles.shopButtonText, { color: palette.text }]}>Go to Shop</Text>
          <ChevronRight size={16} color={palette.muted} />
        </Pressable>
      </View>

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
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 14,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  email: {
    fontSize: 16,
    fontWeight: "600",
  },
  creditsCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  creditsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  creditsLabel: {
    fontSize: 13,
  },
  creditsValue: {
    fontSize: 30,
    fontWeight: "800",
  },
  creditsLoader: {
    alignSelf: "flex-start",
  },
  shopButton: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shopButtonText: {
    fontSize: 15,
    fontWeight: "700",
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
    opacity: 0.86,
  },
});
