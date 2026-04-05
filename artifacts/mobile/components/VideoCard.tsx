import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { Video, formatRelativeTime } from "@/services/youtube";

interface VideoCardProps {
  video: Video;
}

export function VideoCard({ video }: VideoCardProps) {
  const colors = useColors();
  const router = useRouter();

  const handlePress = async () => {
    if (Platform.OS === "web") {
      // Canvas/browser preview — use the in-app WebView player
      router.push({
        pathname: "/player",
        params: { videoId: video.id, title: video.title },
      });
    } else {
      // iOS / Android — open in SFSafariViewController (real Safari engine).
      // YouTube cannot detect this as an app WebView, so error 153 never occurs.
      await WebBrowser.openBrowserAsync(
        `https://www.youtube.com/watch?v=${video.id}`,
        {
          presentationStyle:
            WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          toolbarColor: "#000000",
          controlsColor: "#FF0000",
        }
      );
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.thumbnailWrapper}>
        {video.thumbnail ? (
          <Image
            source={{ uri: video.thumbnail }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.thumbnail,
              styles.thumbnailPlaceholder,
              { backgroundColor: colors.secondary },
            ]}
          >
            <Feather name="youtube" size={32} color={colors.mutedForeground} />
          </View>
        )}
        <View style={styles.playOverlay}>
          <View
            style={[
              styles.playButton,
              { backgroundColor: "rgba(0,0,0,0.7)" },
            ]}
          >
            <Feather name="play" size={18} color="#fff" />
          </View>
        </View>
      </View>

      <View style={styles.info}>
        <Text
          style={[styles.title, { color: colors.foreground }]}
          numberOfLines={2}
        >
          {video.title}
        </Text>
        <View style={styles.meta}>
          <Text
            style={[styles.channel, { color: colors.primary }]}
            numberOfLines={1}
          >
            {video.channelTitle}
          </Text>
          <Text style={[styles.dot, { color: colors.mutedForeground }]}>
            •
          </Text>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            {formatRelativeTime(video.publishedAt)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  thumbnailWrapper: {
    position: "relative",
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  playOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    paddingTop: 10,
    paddingHorizontal: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "600" as const,
    lineHeight: 20,
    marginBottom: 6,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  channel: {
    fontSize: 12,
    fontWeight: "500" as const,
    flexShrink: 1,
  },
  dot: {
    fontSize: 12,
  },
  date: {
    fontSize: 12,
  },
});
