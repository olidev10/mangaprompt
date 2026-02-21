import { useRouter } from "expo-router";
import { Dices, Minus, Plus } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const STORY_SEEDS = [
  "a blind exorcist and a neon fox spirit track ghosts through a flooded megacity",
  "a retired mecha pilot has one night to protect a floating market from sky raiders",
  "two rival chefs duel using spirit beasts inside an underground tournament",
  "a mountain shrine maiden negotiates peace between dragons and miners",
  "a courier on rollerblades delivers forbidden memories across a dystopian capital",
  "a samurai detective solves a murder where time loops every sunrise",
];

export default function CreateScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  const [prompt, setPrompt] = useState("");
  const [totalPages, setTotalPages] = useState(6);

  const isValid = prompt.trim().length > 0 && totalPages > 0;

  const helper = useMemo(
    () => `Pages: ${totalPages} (recommended 4 to 10)`,
    [totalPages],
  );

  const randomizePrompt = () => {
    const seed = STORY_SEEDS[Math.floor(Math.random() * STORY_SEEDS.length)];
    setPrompt(seed);
  };

  const updatePages = (next: number) => {
    const clamped = Math.max(1, Math.min(20, next));
    setTotalPages(clamped);
  };

  const startCreate = () => {
    if (!isValid) return;
    router.push({
      pathname: "/process" as never,
      params: {
        prompt: prompt.trim(),
        totalPages: String(totalPages),
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: palette.background }]}
      behavior={Platform.select({ ios: "padding", default: undefined })}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: palette.text }]}>Create Manga</Text>
        <Text style={[styles.subtitle, { color: palette.muted }]}>Type a story prompt and pick page count.</Text>

        <Text style={[styles.label, { color: palette.text }]}>Prompt</Text>
        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Describe your manga story..."
          placeholderTextColor={palette.muted}
          multiline
          textAlignVertical="top"
          style={[
            styles.input,
            {
              color: palette.text,
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        />

        <Pressable
          accessibilityRole="button"
          onPress={randomizePrompt}
          style={({ pressed }) => [
            styles.dice,
            {
              borderColor: palette.border,
              backgroundColor: palette.surface,
            },
            pressed ? styles.pressed : null,
          ]}
        >
          <Dices size={18} color={palette.text} />
          <Text style={[styles.diceText, { color: palette.text }]}>Dice prompt</Text>
        </Pressable>

        <Text style={[styles.label, { color: palette.text }]}>Number of pages</Text>
        <View style={[styles.counterRow, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => updatePages(totalPages - 1)}
            style={({ pressed }) => [styles.counterBtn, pressed ? styles.pressed : null]}
          >
            <Minus size={20} color={palette.text} />
          </Pressable>
          <Text style={[styles.pageValue, { color: palette.text }]}>{totalPages}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => updatePages(totalPages + 1)}
            style={({ pressed }) => [styles.counterBtn, pressed ? styles.pressed : null]}
          >
            <Plus size={20} color={palette.text} />
          </Pressable>
        </View>
        <Text style={[styles.helper, { color: palette.muted }]}>{helper}</Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={startCreate}
          disabled={!isValid}
          style={({ pressed }) => [
            styles.createBtn,
            { backgroundColor: palette.tint },
            pressed && isValid ? styles.pressed : null,
            !isValid ? styles.disabled : null,
          ]}
        >
          <Text style={styles.createBtnText}>Create</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: 60,
  },
  content: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    minHeight: 170,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 12,
  },
  dice: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 18,
  },
  diceText: {
    fontSize: 14,
    fontWeight: "700",
  },
  counterRow: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pageValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  helper: {
    marginTop: 8,
    fontSize: 13,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  createBtn: {
    width: "100%",
    minHeight: 58,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.45,
  },
});
