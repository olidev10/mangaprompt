import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import AuthScreen from "@/app/auth";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const { session, loading } = useAuth();
  const palette = Colors[useColorScheme() ?? "light"];

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: palette.background,
        }}
      >
        <ActivityIndicator color={palette.tint} />
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return <Redirect href="/(tabs)" />;
}
