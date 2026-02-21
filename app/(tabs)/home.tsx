import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { BookOpenText, MoreVertical, Plus, X } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "@/constants/theme";
import { exportProjectToPdf } from "@/functions/utils";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { Json, Tables } from "@/lib/database";
import { supabase } from "@/lib/supabase";

type ProjectCard = {
  id: number;
  title: string;
  totalPages: number;
  createdAt: string;
  pageImageUrls: string[];
  coverUrl: string | null;
};

const readPageUrls = (
  pages: Pick<Tables<"Projects">, "pages">["pages"],
): string[] => {
  if (!Array.isArray(pages)) {
    return [];
  }

  return pages
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (item && typeof item === "object" && !Array.isArray(item)) {
        const imageUrl = (item as Record<string, Json | undefined>).imageUrl;
        return typeof imageUrl === "string" ? imageUrl : null;
      }

      return null;
    })
    .filter((url): url is string => Boolean(url));
};

const toProjectCard = (row: Tables<"Projects">): ProjectCard => {
  const pageImageUrls = readPageUrls(row.pages);
  const firstPage = pageImageUrls[0] ?? null;

  return {
    id: row.id,
    title: row.title,
    totalPages: row.total_pages,
    createdAt: row.created_at,
    pageImageUrls,
    coverUrl: row.cover_url ?? firstPage,
  };
};

const listAllFilesUnderPrefix = async (prefix: string): Promise<string[]> => {
  const files: string[] = [];

  const walk = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("pages")
      .list(path, { limit: 1000, offset: 0 });

    if (error) {
      throw new Error(error.message);
    }

    for (const item of data ?? []) {
      const childPath = `${path}/${item.name}`;
      const isFolder = item.id === null;

      if (isFolder) {
        await walk(childPath);
      } else {
        files.push(childPath);
      }
    }
  };

  await walk(prefix);
  return files;
};

const deleteProjectAssets = async (userId: string, projectId: number) => {
  try {
    const folderPrefix = `${userId}/${projectId}`;
    const filePaths = await listAllFilesUnderPrefix(folderPrefix);

    if (filePaths.length > 0) {
      const { error: removeStorageError } = await supabase.storage
        .from("pages")
        .remove(filePaths);

      if (removeStorageError) {
        throw new Error(removeStorageError.message);
      }
    }

    const { error: deleteProjectError } = await supabase
      .from("Projects")
      .delete()
      .eq("id", projectId)
      .eq("user_id", userId);

    if (deleteProjectError) {
      throw new Error(deleteProjectError.message);
    }
    return { ok: true };
  } catch (e) {
    const error =
      e instanceof Error
        ? e.message
        : JSON.stringify(e) ||
          "An unknown error occurred while deleting the project.";
    return { ok: false, error };
  }
};

export default function HomeScreen() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectCard | null>(null);
  const [viewerProject, setViewerProject] = useState<ProjectCard | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const screenWidth = Dimensions.get("window").width;

  const fetchProjects = useCallback(async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setProjects([]);
      setUserId(null);
      return;
    }

    setUserId(authData.user.id);

    const { data, error } = await supabase
      .from("Projects")
      .select("*")
      .eq("user_id", authData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    setProjects((data ?? []).map(toProjectCard));
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const run = async () => {
        try {
          await fetchProjects();
        } catch (e) {
          if (!mounted) return;
          console.error(e);
          const err =
            e instanceof Error ? e.message : "Failed to load projects.";
          Alert.alert("Projects", err);
        } finally {
          if (mounted) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      };

      run();

      return () => {
        mounted = false;
      };
    }, [fetchProjects]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProjects()
      .catch((e) => {
        const err =
          e instanceof Error ? e.message : "Failed to refresh projects.";
        Alert.alert("Projects", err);
      })
      .finally(() => setRefreshing(false));
  }, [fetchProjects]);

  const downloadProject = useCallback(async (project: ProjectCard) => {
    if (!project.pageImageUrls.length) {
      Alert.alert("Download", "No page images found for this project.");
      return;
    }

    try {
      await exportProjectToPdf(project.title, project.pageImageUrls);
      setActiveProject(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not export this project.";
      Alert.alert("Download", message);
    }
  }, []);

  const deleteProject = useCallback(
    (project: ProjectCard) => {
      if (!userId) {
        Alert.alert("Delete", "User not authenticated.");
        return;
      }

      Alert.alert(
        "Delete project",
        `Delete \"${project.title}\" from storage and database?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteProjectAssets(userId, project.id);
                setProjects((prev) =>
                  prev.filter((item) => item.id !== project.id),
                );
                setActiveProject(null);
              } catch (error) {
                const message =
                  error instanceof Error
                    ? error.message
                    : "Could not delete this project.";
                Alert.alert("Delete", message);
              }
            },
          },
        ],
      );
    },
    [userId],
  );

  const listContentStyle = useMemo(
    () => (projects.length === 0 ? styles.emptyContent : styles.listContent),
    [projects.length],
  );

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.text }]}>Your Manga</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(tabs)/create" as never)}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: palette.tint },
            pressed ? styles.pressed : null,
          ]}
        >
          <Plus size={18} color="#FFFFFF" />
          <Text style={styles.addButtonLabel}>New</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={palette.tint} />
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => String(item.id)}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={listContentStyle}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => setViewerProject(item)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
                pressed ? styles.pressed : null,
              ]}
            >
              <Image
                source={{ uri: item.coverUrl ?? undefined }}
                style={styles.thumbnail}
                contentFit="cover"
              />

              <View style={styles.cardBody}>
                <View style={styles.cardHeaderRow}>
                  <Text
                    style={[styles.cardTitle, { color: palette.text }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>

                  <Pressable
                    accessibilityRole="button"
                    onPress={(event) => {
                      event.stopPropagation();
                      setActiveProject(item);
                    }}
                    style={({ pressed }) => [
                      styles.menuButton,
                      { borderColor: palette.border },
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <MoreVertical size={16} color={palette.text} />
                  </Pressable>
                </View>

                <Text style={[styles.cardMeta, { color: palette.muted }]}>
                  {item.totalPages} pages
                </Text>
                <Text style={[styles.cardMeta, { color: palette.muted }]}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View
              style={[
                styles.emptyCard,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.surface,
                },
              ]}
            >
              <BookOpenText size={32} color={palette.muted} />
              <Text style={[styles.emptyTitle, { color: palette.text }]}>
                No manga yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: palette.muted }]}>
                Create one from the Create tab.
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={activeProject !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveProject(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setActiveProject(null)}
        >
          <View
            style={[
              styles.menuSheet,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.menuTitle, { color: palette.text }]}>
              {activeProject?.title ?? "Project"}
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => activeProject && downloadProject(activeProject)}
              style={({ pressed }) => [
                styles.menuItem,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={[styles.menuItemText, { color: palette.text }]}>
                Download PDF
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => activeProject && deleteProject(activeProject)}
              style={({ pressed }) => [
                styles.menuItem,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={[styles.menuDeleteText, { color: "#DC2626" }]}>
                Delete
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setActiveProject(null)}
              style={({ pressed }) => [
                styles.menuItem,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={[styles.menuItemText, { color: palette.muted }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={viewerProject !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setViewerProject(null)}
      >
        <View style={styles.viewerRoot}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setViewerProject(null)}
            style={styles.viewerClose}
          >
            <X size={24} color="#FFFFFF" />
          </Pressable>

          <FlatList
            data={viewerProject?.pageImageUrls ?? []}
            keyExtractor={(item, index) => `${item}-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={[styles.viewerPage, { width: screenWidth }]}>
                <Image source={{ uri: item }} style={styles.viewerImage} contentFit="contain" />
              </View>
            )}
            ListEmptyComponent={
              <View style={[styles.viewerPage, { width: screenWidth }]}>
                <Text style={styles.viewerEmptyText}>No pages available.</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    minHeight: 38,
    borderRadius: 999,
  },
  addButtonLabel: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: 28,
    gap: 12,
  },
  emptyContent: {
    flexGrow: 1,
  },
  emptyCard: {
    flex: 1,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    flexDirection: "row",
    minHeight: 120,
  },
  thumbnail: {
    width: 88,
    height: "100%",
    backgroundColor: "#0F172A",
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  cardMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  menuButton: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  menuSheet: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  menuItem: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "600",
  },
  menuDeleteText: {
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.86,
  },
  viewerRoot: {
    flex: 1,
    backgroundColor: "#000000",
    paddingTop: Platform.select({ ios: 54, default: 20 }),
  },
  viewerClose: {
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
  viewerPage: {
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImage: {
    width: "100%",
    height: "100%",
  },
  viewerEmptyText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
