import { Image } from "expo-image";
import {
  Stack,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { LoaderCircle, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "@/constants/theme";
import {
  processMangaGeneration,
  type ProcessLog,
  type ProcessProgressEvent,
} from "@/functions/process";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function ProcessScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{
    prompt?: string;
    totalPages?: string;
  }>();

  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  const prompt = typeof params.prompt === "string" ? params.prompt : "";
  const totalPages = Number(params.totalPages ?? "0");
  const screenWidth = Dimensions.get("window").width;

  const [isRunning, setIsRunning] = useState(true);
  const [title, setTitle] = useState("Creating your manga...");
  const [logs, setLogs] = useState<ProcessLog[]>([]);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const startedRef = useRef(false);

  useEffect(() => {
    if (!isRunning) return;

    const sub = navigation.addListener("beforeRemove", (event) => {
      event.preventDefault();
    });

    return sub;
  }, [isRunning, navigation]);

  useEffect(() => {
    if (!isRunning) return;

    const onBackPress = () => true;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );

    return () => subscription.remove();
  }, [isRunning]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!prompt.trim() || !Number.isInteger(totalPages) || totalPages < 1) {
      setError("Invalid request. Please go back to Create and retry.");
      setIsRunning(false);
      return;
    }

    const run = async () => {
      const onProgress = (event: ProcessProgressEvent) => {
        setLogs((prev) => [...prev, event]);

        if (event.pageImageUrl) {
          setPageImages((prev) =>
            prev.includes(event.pageImageUrl as string)
              ? prev
              : [...prev, event.pageImageUrl as string],
          );
        }
      };

      const result = await processMangaGeneration(prompt, totalPages, {
        onProgress,
      });

      if (!result.ok) {
        setError(result.error);
        setLogs(result.logs);
        setIsRunning(false);
        return;
      }

      setLogs(result.data.logs);
      setTitle(result.data.title);
      setPageImages(result.data.pageImageUrls);

      setIsRunning(false);
    };

    run();
  }, [prompt, totalPages]);

  const statusText = useMemo(() => {
    if (error) return "Generation failed";
    if (isRunning) return "Generation in progress";
    return "Generation complete";
  }, [error, isRunning]);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { color: palette.muted }]}>
          {statusText}
        </Text>
      </View>

      {isRunning ? (
        <View style={styles.runningBox}>
          <LoaderCircle size={18} color={palette.tint} />
          <Text style={[styles.runningText, { color: palette.text }]}>
            Please keep this screen open while pages are being generated.
          </Text>
        </View>
      ) : null}

      {error ? (
        <Text style={[styles.error, { color: "#DC2626" }]}>{error}</Text>
      ) : null}

      <Text style={[styles.sectionTitle, { color: palette.text }]}>
        Generated pages
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.imageRow}
      >
        {pageImages.length === 0 ? (
          <View
            style={[
              styles.placeholder,
              { borderColor: palette.border, backgroundColor: palette.surface },
            ]}
          >
            <Text style={[styles.placeholderText, { color: palette.muted }]}>
              Pages will appear here as they finish.
            </Text>
          </View>
        ) : (
          pageImages.map((uri, index) => (
            <Pressable
              key={`${uri}-${index}`}
              accessibilityRole="button"
              onPress={() => setViewerIndex(index)}
              style={({ pressed }) => [
                styles.pageCard,
                pressed ? styles.pressed : null,
              ]}
            >
              <Image
                source={{ uri }}
                style={styles.pageImage}
                contentFit="cover"
              />
              <Text style={[styles.pageLabel, { color: palette.text }]}>
                Page {index + 1}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      <Text style={[styles.sectionTitle, { color: palette.text }]}>
        Progress logs
      </Text>
      <ScrollView
        style={[
          styles.logs,
          { borderColor: palette.border, backgroundColor: palette.surface },
        ]}
      >
        {logs.map((log) => (
          <View key={log.id} style={styles.logItem}>
            <Text style={[styles.logStage, { color: palette.tint }]}>
              {log.stage.toUpperCase()}
            </Text>
            <Text style={[styles.logText, { color: palette.text }]}>
              {log.message}
            </Text>
          </View>
        ))}
      </ScrollView>

      {!isRunning ? (
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/(tabs)/home" as never)}
            style={({ pressed }) => [
              styles.homeBtn,
              { borderColor: palette.border, backgroundColor: palette.surface },
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={[styles.homeBtnText, { color: palette.text }]}>
              Back to Home
            </Text>
          </Pressable>
        </View>
      ) : null}

      <Modal
        visible={viewerIndex !== null}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={[styles.modalRoot, { backgroundColor: "#000000" }]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setViewerIndex(null)}
            style={styles.modalClose}
          >
            <X size={24} color="#FFFFFF" />
          </Pressable>

          <ScrollView
            horizontal
            pagingEnabled
            contentOffset={{ x: screenWidth * (viewerIndex ?? 0), y: 0 }}
            showsHorizontalScrollIndicator={false}
          >
            {pageImages.map((item, index) => (
              <View
                key={`${item}-${index}`}
                style={[styles.modalPage, { width: screenWidth }]}
              >
                <Image
                  source={{ uri: item }}
                  style={styles.modalImage}
                  contentFit="contain"
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  header: {
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
  },
  runningBox: {
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  runningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  error: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "600",
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "800",
  },
  imageRow: {
    gap: 10,
    paddingBottom: 4,
    minHeight: 200,
  },
  placeholder: {
    borderWidth: 1,
    borderRadius: 12,
    width: 240,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  placeholderText: {
    textAlign: "center",
    fontSize: 13,
  },
  pageCard: {
    width: 130,
    gap: 4,
  },
  pageImage: {
    width: 130,
    height: 170,
    borderRadius: 8,
    backgroundColor: "#0F172A",
  },
  pageLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  logs: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  logItem: {
    marginBottom: 10,
    gap: 2,
  },
  logStage: {
    fontSize: 11,
    fontWeight: "800",
  },
  logText: {
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    marginTop: 12,
    gap: 10,
  },
  homeBtn: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  homeBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.85,
  },
  modalRoot: {
    flex: 1,
    paddingTop: Platform.select({ ios: 54, default: 20 }),
  },
  modalClose: {
    position: "absolute",
    top: Platform.select({ ios: 58, default: 20 }),
    right: 14,
    zIndex: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalPage: {
    alignItems: "center",
    justifyContent: "center",
  },
  modalImage: {
    width: "100%",
    height: "100%",
  },
});
