import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SkeletonCard } from "@/components/SkeletonCard";
import { VideoCard } from "@/components/VideoCard";
import { useChannels } from "@/context/ChannelsContext";
import { useColors } from "@/hooks/useColors";
import { Video } from "@/services/youtube";

export default function FeedScreen() {
  const colors = useColors();
  const { videos, loading, refreshing, refresh, channels, loadMore, loadingMore } =
    useChannels();
  const router = useRouter();

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={[1, 2, 3, 4]}
          keyExtractor={(item) => String(item)}
          renderItem={() => <SkeletonCard />}
          contentContainerStyle={styles.list}
          scrollEnabled={false}
        />
      </View>
    );
  }

  if (channels.length === 0) {
    return (
      <View style={[styles.container, styles.empty, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
          <Feather name="youtube" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          No channels yet
        </Text>
        <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
          Head to Settings to add your favorite YouTube channels and start watching.
        </Text>
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(tabs)/settings")}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.emptyButtonText}>Add Channels</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={[styles.container, styles.empty, { backgroundColor: colors.background }]}>
        <Feather name="inbox" size={40} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          No videos found
        </Text>
        <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
          Pull down to refresh or add more channels in Settings.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList<Video>
        data={videos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <VideoCard video={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 100 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700" as const, textAlign: "center" },
  emptyBody: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  emptyButtonText: { color: "#fff", fontWeight: "600" as const, fontSize: 15 },
  footer: { paddingVertical: 24, alignItems: "center" },
});
