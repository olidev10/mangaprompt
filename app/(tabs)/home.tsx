import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { BookOpenText, Plus } from "lucide-react-native";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useMangaLibrary } from "@/contexts/manga-library-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function HomeScreen() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const { mangas } = useMangaLibrary();
  const router = useRouter();

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

      <FlatList
        data={mangas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          mangas.length === 0 ? styles.emptyContent : styles.listContent
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Image
              source={{ uri: item.pageImageUrls[0] }}
              style={styles.thumbnail}
              contentFit="cover"
            />
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: palette.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.cardMeta, { color: palette.muted }]}>
                {item.totalPages} pages
              </Text>
              <Text style={[styles.cardMeta, { color: palette.muted }]} numberOfLines={2}>
                {item.prompt}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
            <BookOpenText size={32} color={palette.muted} />
            <Text style={[styles.emptyTitle, { color: palette.text }]}>No manga yet</Text>
            <Text style={[styles.emptySubtitle, { color: palette.muted }]}>Create one from the Create tab.</Text>
          </View>
        }
      />
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
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  cardMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.86,
  },
});
