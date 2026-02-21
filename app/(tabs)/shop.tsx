import { useFocusEffect } from "@react-navigation/native";
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

type CreditPack = {
  id: string;
  label: string;
  credits: number;
};

const PACKS: CreditPack[] = [
  { id: "starter", label: "Starter", credits: 10 },
  { id: "plus", label: "Plus", credits: 25 },
  { id: "pro", label: "Pro", credits: 50 },
];

async function getUserCredits(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.credits ?? 0;
}

export default function ShopScreen() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const { session } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [buyingPackId, setBuyingPackId] = useState<string | null>(null);

  const userId = session?.user.id ?? null;

  const loadCredits = useCallback(async () => {
    if (!userId) {
      setCredits(null);
      return;
    }

    const balance = await getUserCredits(userId);
    setCredits(balance);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadCredits().catch((error) => {
        const message =
          error instanceof Error ? error.message : "Failed to load credits.";
        Alert.alert("Credits", message);
      });
    }, [loadCredits]),
  );

  const onBuy = useCallback(
    async (pack: CreditPack) => {
      if (!userId) {
        Alert.alert("Shop", "User not authenticated.");
        return;
      }

      setBuyingPackId(pack.id);
      try {
        const currentCredits = await getUserCredits(userId);
        const nextCredits = currentCredits + pack.credits;

        const { error } = await supabase
          .from("profiles")
          .update({ credits: nextCredits })
          .eq("id", userId);

        if (error) {
          throw new Error(error.message);
        }

        setCredits(nextCredits);
        Alert.alert("Purchase complete", `Added ${pack.credits} credits.`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not update credits.";
        Alert.alert("Shop", message);
      } finally {
        setBuyingPackId(null);
      }
    },
    [userId],
  );

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={[styles.title, { color: palette.text }]}>Shop</Text>
      <Text style={[styles.subtitle, { color: palette.muted }]}>
        Buy credits (temporary local pricing flow).
      </Text>

      <View
        style={[
          styles.balanceCard,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Text style={[styles.balanceLabel, { color: palette.muted }]}>
          Current credits
        </Text>
        <Text style={[styles.balanceValue, { color: palette.text }]}>
          {credits === null ? "-" : credits}
        </Text>
      </View>

      <View style={styles.packList}>
        {PACKS.map((pack) => {
          const isBusy = buyingPackId === pack.id;
          const isDisabled = buyingPackId !== null;

          return (
            <Pressable
              key={pack.id}
              accessibilityRole="button"
              onPress={() => onBuy(pack)}
              disabled={isDisabled}
              style={({ pressed }) => [
                styles.packButton,
                { backgroundColor: palette.tint },
                pressed && !isDisabled ? styles.pressed : null,
                isDisabled ? styles.disabled : null,
              ]}
            >
              {isBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.packButtonText}>
                  Buy {pack.label} (+{pack.credits})
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 16,
    fontSize: 14,
  },
  balanceCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
    gap: 6,
  },
  balanceLabel: {
    fontSize: 13,
  },
  balanceValue: {
    fontSize: 30,
    fontWeight: "800",
  },
  packList: {
    gap: 10,
  },
  packButton: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  packButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.5,
  },
});
