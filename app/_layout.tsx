// src/app/_layout.tsx
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { Redirect, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { StatusBar, useColorScheme } from "react-native";

SplashScreen.preventAutoHideAsync();

function RootInner() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const theme = useColorScheme() ?? "light";

  useEffect(() => {
    let mounted = true;
    const prepare = async () => {
      // brief wait to show splash nicely
      await new Promise((r) => setTimeout(r, 500));
      if (!mounted) return;
      setReady(true);
      await SplashScreen.hideAsync();
    };
    prepare();
    return () => {
      mounted = false;
    };
  }, []);

  // still initializing auth
  if (!ready || loading) return null;

  // redirect logic
  // if no session and not on /auth -> redirect to /auth
  if (!session && segments[0] !== "auth") {
    return <Redirect href="/auth" />;
  }

  // if there is session and currently on /auth -> go to tabs/home
  if (session && segments[0] === "auth") {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <>
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={theme === "dark" ? "#000000" : "#FFFFFF"}
      />
      <Stack>
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="process"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootInner />
    </AuthProvider>
  );
}
